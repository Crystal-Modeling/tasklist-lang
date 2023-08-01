import type { ServerHttp2Stream } from 'http2'
import type * as id from '../semantic/identity'
import type { Highlight, Rename } from './model'
import { Update } from './model'

export interface LmsSubscriptions {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscription(modelId: string): LmsSubscription | undefined
}

export interface LmsSubscription {
    pushUpdate<SM extends id.SemanticIdentity>(update: Update<SM>): void
    pushRename(rename: Rename): void
    pushHighlight(highlight: Highlight): void
}

class SingleLmsSubscription implements LmsSubscription {
    private readonly stream: ServerHttp2Stream

    constructor(stream: ServerHttp2Stream) {
        this.stream = stream
    }

    public pushUpdate<SM extends id.SemanticIdentity>(update: Update<SM>): void {
        console.debug('Pushing update for model with id', update.id)
        console.debug((Update.isEmpty(update) ? 'EMPTY' : JSON.stringify(update, undefined, 2)))
        this.stream.write(JSON.stringify(update))
    }

    public pushRename(rename: Rename): void {
        console.debug('Pushing rename for submodel with id', rename.id)
        this.stream.write(JSON.stringify(rename))
    }

    public pushHighlight(highlight: Highlight): void {
        console.debug('Pushing highlight for submodel with id', highlight.id)
        this.stream.write(JSON.stringify(highlight))
    }

}

class CompositeLmsSubscription implements LmsSubscription {
    readonly subscriptions: Set<SingleLmsSubscription> = new Set()

    public pushUpdate<SM extends id.SemanticIdentity>(update: Update<SM>): void {
        this.subscriptions.forEach(sub => sub.pushUpdate(update))
    }

    public pushRename(rename: Rename): void {
        this.subscriptions.forEach(sub => sub.pushRename(rename))
    }

    public pushHighlight(highlight: Highlight): void {
        this.subscriptions.forEach(sub => sub.pushHighlight(highlight))
    }
}

export class DefaultLmsSubscriptions implements LmsSubscriptions {

    private subscriptionsByModelId = new Map<string, CompositeLmsSubscription>()

    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void {
        const subscription = new SingleLmsSubscription(subscriptionStream)
        let modelSubscriptions = this.subscriptionsByModelId.get(id) ?? new CompositeLmsSubscription()
        if (!this.subscriptionsByModelId.has(id)) {
            this.subscriptionsByModelId.set(id, modelSubscriptions)
        }
        modelSubscriptions.subscriptions.add(subscription)
        subscriptionStream.once('close', () => {
            console.debug('The connection for id', id, 'got closed')
            modelSubscriptions.subscriptions.delete(subscription)
            const modelSubscriptionsNow = this.subscriptionsByModelId.get(id)
            if (modelSubscriptionsNow && modelSubscriptionsNow.subscriptions.size === 0) {
                this.subscriptionsByModelId.delete(id)
            }
        })
    }

    getSubscription(modelId: string): LmsSubscription | undefined {
        return this.subscriptionsByModelId.get(modelId)
    }
}
