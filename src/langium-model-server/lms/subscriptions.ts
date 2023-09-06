import type { ServerHttp2Stream } from 'http2'
import type * as id from '../semantic/identity'
import type { Highlight, RootUpdate } from './model'
import { Update } from './model'

export interface LmsSubscriptions {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscription(modelId: string): LmsSubscription | undefined
}

export interface LmsSubscription {
    pushUpdate<SM extends id.SemanticIdentity>(modelUpdate: RootUpdate<SM>): void
    pushHighlight(highlight: Highlight): void
}

class SingleLmsSubscription implements LmsSubscription {
    private readonly stream: ServerHttp2Stream

    constructor(stream: ServerHttp2Stream) {
        this.stream = stream
    }

    public pushUpdate<SM extends id.SemanticIdentity>(modelUpdate: RootUpdate<SM>): void {
        console.debug('Pushing update for model with id', modelUpdate.id)
        console.debug((Update.isEmpty(modelUpdate) ? 'EMPTY' : JSON.stringify(modelUpdate, undefined, 2)))
        this.stream.write(JSON.stringify(modelUpdate))
    }

    public pushHighlight(highlight: Highlight): void {
        console.debug('Pushing highlight for submodel with id', highlight.id)
        this.stream.write(JSON.stringify(highlight))
    }

}

class CompositeLmsSubscription implements LmsSubscription {
    readonly subscriptions: Set<SingleLmsSubscription> = new Set()

    public pushUpdate<SM extends id.SemanticIdentity>(modelUpdate: RootUpdate<SM>): void {
        this.subscriptions.forEach(sub => sub.pushUpdate(modelUpdate))
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
