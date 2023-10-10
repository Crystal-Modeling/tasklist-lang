import type { ServerHttp2Stream } from 'http2'
import type * as id from '../identity/model'
import type { Action, RootUpdate } from './model'
import { Update } from './model'
import type { ModelUpdateCombiner } from './model-update-combiner'

export interface LmsSubscriptions<SM extends id.SemanticIdentifier> {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscription(modelId: string): LmsSubscription<SM> | undefined
}

export interface LmsSubscription<SM extends id.SemanticIdentifier> {
    /**
     * @returns `true` if the update was immediately pushed (`modelUpdate` not empty and accumulation was not awaited)
     */
    pushModelUpdate(modelUpdate: RootUpdate<SM>, awaitAccumulation?: boolean): boolean
    pushUpdate<M extends id.SemanticIdentifier>(modelUpdate: RootUpdate<M>): void
    pushAction(action: Action): void
}

export class DefaultLmsSubscriptions<SM extends id.SemanticIdentifier> implements LmsSubscriptions<SM> {

    private readonly modelUpdateCombiner: ModelUpdateCombiner<SM>
    private readonly accumulationAwaitingMs: number = 300

    private subscriptionsByModelId = new Map<string, CompositeLmsSubscription<SM>>()

    public constructor(modelUpdateCombiner: ModelUpdateCombiner<SM>) {
        this.modelUpdateCombiner = modelUpdateCombiner
    }

    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void {
        let modelSubscriptions = this.subscriptionsByModelId.get(id) ?? new CompositeLmsSubscription(this.modelUpdateCombiner, this.accumulationAwaitingMs)
        if (!this.subscriptionsByModelId.has(id)) {
            this.subscriptionsByModelId.set(id, modelSubscriptions)
        }
        if (modelSubscriptions.add(subscriptionStream)) {
            subscriptionStream.once('close', () => {
                console.debug('The connection for id', id, 'got closed')
                modelSubscriptions.delete(subscriptionStream)
                const modelSubscriptionsNow = this.subscriptionsByModelId.get(id)
                if (modelSubscriptionsNow && modelSubscriptionsNow.size === 0) {
                    this.subscriptionsByModelId.delete(id)
                }
            })
        } else {
            console.warn('Attempt to add existing subscription detected. It will not be added. ID=', id)
        }
    }

    getSubscription(modelId: string): LmsSubscription<SM> | undefined {
        return this.subscriptionsByModelId.get(modelId)
    }
}

class CompositeLmsSubscription<SM extends id.SemanticIdentifier> implements LmsSubscription<SM> {
    private readonly modelUpdateCombiner: ModelUpdateCombiner<SM>
    private readonly accumulationAwaitingMs: number

    private readonly subscriptionStreams: Set<ServerHttp2Stream> = new Set()
    private readonly accumulatedModelUpdatesForNewSubscriptions: Map<ServerHttp2Stream, Array<RootUpdate<SM>>> = new Map()
    private accumulatedModelUpdates: Array<RootUpdate<SM>> = []
    private updatePushingTimeout: NodeJS.Timeout | undefined
    private modelUpdateScheduled: boolean = false

    constructor(modelUpdateCombiner: ModelUpdateCombiner<SM>, accumulationAwaitingMs: number) {
        this.modelUpdateCombiner = modelUpdateCombiner
        this.accumulationAwaitingMs = accumulationAwaitingMs
    }

    /**
     * @returns `true` if `subscriptionStream` has been added
     */
    public add(subscriptionStream: ServerHttp2Stream): boolean {
        if (this.subscriptionStreams.has(subscriptionStream) || this.accumulatedModelUpdatesForNewSubscriptions.has(subscriptionStream)) {
            return false
        }
        if (!this.modelUpdateScheduled) {
            this.subscriptionStreams.add(subscriptionStream)
        } else {
            console.warn('Rare action: new subscription is added while root model update is scheduled')
            this.accumulatedModelUpdatesForNewSubscriptions.set(subscriptionStream, [])
        }
        return true
    }

    /**
     * @returns — `true` if `subscriptionStream` existed and has been removed, or false if it does not exist.
     */
    public delete(subscriptionStream: ServerHttp2Stream): boolean {
        return this.subscriptionStreams.delete(subscriptionStream) || this.accumulatedModelUpdatesForNewSubscriptions.delete(subscriptionStream)
    }

    public get size(): number {
        return this.subscriptionStreams.size + this.accumulatedModelUpdatesForNewSubscriptions.size
    }

    public pushModelUpdate(modelUpdate: RootUpdate<SM>, awaitAccumulation?: boolean): boolean {
        if (!Update.isEmpty(modelUpdate)) {
            this.accumulatedModelUpdates.push(modelUpdate)
            for (const newSub of this.accumulatedModelUpdatesForNewSubscriptions.keys()) {
                this.accumulatedModelUpdatesForNewSubscriptions.get(newSub)?.push(modelUpdate)
            }

            if (awaitAccumulation) {
                this.modelUpdateScheduled = true
                if (!this.updatePushingTimeout) {
                    this.updatePushingTimeout = setTimeout(this.combineAndPushModelUpdates.bind(this), this.accumulationAwaitingMs)
                } else {
                    this.updatePushingTimeout.refresh()
                }
            }
        }
        if (!awaitAccumulation) {
            clearTimeout(this.updatePushingTimeout)
            this.updatePushingTimeout = undefined
            return this.combineAndPushModelUpdates()
        }
        return false
    }

    public pushUpdate<SM extends id.SemanticIdentifier>(modelUpdate: RootUpdate<SM>): void {
        if (!Update.isEmpty(modelUpdate)) {
            for (const stream of this.subscriptionStreams) {
                pushUpdateToStream(modelUpdate, stream)
            }
            for (const stream of this.accumulatedModelUpdatesForNewSubscriptions.keys()) {
                pushUpdateToStream(modelUpdate, stream)
            }
        }
    }

    public pushAction(action: Action): void {
        for (const stream of this.subscriptionStreams) {
            pushActionToStream(action, stream)
        }
    }

    protected combineAndPushModelUpdates(): boolean {
        this.modelUpdateScheduled = false

        const update = this.modelUpdateCombiner.combineUpdates(this.accumulatedModelUpdates)
        if (this.accumulatedModelUpdates.length > 0) {
            this.accumulatedModelUpdates = []
        }
        if (update && !Update.isEmpty(update)) {
            for (const stream of this.subscriptionStreams) {
                pushUpdateToStream(update, stream)
            }
        } else {
            // FIXME: Optimize the structure of accumulatedModelUpdatesForNewSubscriptions (nested subsets, see your piece of paper)
            // Returning early: if all updates combined are empty, then their combined subsets are also empty
            this.accumulatedModelUpdatesForNewSubscriptions.clear()
            return false
        }

        this.accumulatedModelUpdatesForNewSubscriptions.forEach((updates, newSubStream) => {
            const update = this.modelUpdateCombiner.combineUpdates(updates)
            if (update && !Update.isEmpty(update)) {
                pushUpdateToStream(update, newSubStream)
            }
            this.subscriptionStreams.add(newSubStream)
        })
        this.accumulatedModelUpdatesForNewSubscriptions.clear()
        return true
    }
}

function pushUpdateToStream<SM extends id.SemanticIdentifier>(modelUpdate: RootUpdate<SM>, stream: ServerHttp2Stream): void {
    console.debug('Pushing update for model with id', modelUpdate.id)
    console.debug((Update.isEmpty(modelUpdate) ? 'EMPTY' : JSON.stringify(modelUpdate, undefined, 2)))
    stream.write(JSON.stringify(modelUpdate))
}

function pushActionToStream(action: Action, stream: ServerHttp2Stream) {
    console.debug('Pushing action for submodel', action)
    stream.write(JSON.stringify(action))
}
