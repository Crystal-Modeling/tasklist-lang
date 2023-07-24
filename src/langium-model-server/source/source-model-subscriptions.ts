import type { ServerHttp2Stream } from 'http2'
import { MultiMap } from 'langium'
import type * as id from '../semantic/identity'
import type { Highlight, Rename } from './model'
import { Update } from './model'

export interface SourceModelSubscriptions {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscriptions(modelId: string): Iterable<SourceModelSubscription>
}

export class SourceModelSubscription {
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

export class DefaultSourceModelSubscriptions implements SourceModelSubscriptions {

    private modelSubscriptions = new MultiMap<string, SourceModelSubscription>()

    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void {
        const subscription = new SourceModelSubscription(subscriptionStream)
        this.modelSubscriptions.add(id, subscription)
        subscriptionStream.once('close', () => {
            console.debug('The connection for id', id, 'got closed')
            this.modelSubscriptions.delete(id, subscription)
        })
    }

    getSubscriptions(modelId: string): Iterable<SourceModelSubscription> {
        return this.modelSubscriptions.get(modelId)
    }
}
