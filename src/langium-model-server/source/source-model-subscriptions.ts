import type { ServerHttp2Stream } from 'http2'
import type * as id from '../semantic/identity'
import type { Highlight, Rename } from './model'
import { Update } from './model'

export interface SourceModelSubscriptions {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscription(modelId: string): SourceModelSubscription | undefined
}

export interface SourceModelSubscription {
    pushUpdate<SM extends id.SemanticIdentity>(update: Update<SM>): void
    pushRename(rename: Rename): void
    pushHighlight(highlight: Highlight): void
}

class SingleSourceModelSubscription implements SourceModelSubscription {
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

class CompositeSourceModelSubscription implements SourceModelSubscription {
    readonly subscriptions: Set<SingleSourceModelSubscription> = new Set()

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

export class DefaultSourceModelSubscriptions implements SourceModelSubscriptions {

    private subscriptionsByModelId = new Map<string, CompositeSourceModelSubscription>()

    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void {
        const subscription = new SingleSourceModelSubscription(subscriptionStream)
        const modelSubscriptions = this.subscriptionsByModelId.get(id) ?? new CompositeSourceModelSubscription()
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

    getSubscription(modelId: string): SourceModelSubscription | undefined {
        return this.subscriptionsByModelId.get(modelId)
    }
}
