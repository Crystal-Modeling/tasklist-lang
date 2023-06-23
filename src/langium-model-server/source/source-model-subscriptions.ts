import type { ServerHttp2Stream } from 'http2'
import { MultiMap } from 'langium'

export interface SourceModelSubscriptions {
    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void
    getSubscriptions(id: string): Iterable<ServerHttp2Stream>
}

export class LmsSourceModelSubscriptions implements SourceModelSubscriptions {

    private modelSubscriptions = new MultiMap<string, ServerHttp2Stream>()

    addSubscription(subscriptionStream: ServerHttp2Stream, id: string): void {
        this.modelSubscriptions.add(id, subscriptionStream)
        setTimeout(() => {
            console.debug('Ending the subscription stream')
            subscriptionStream.end()
        }, 40_000)
        // RECHECK: Not sure if it is the right event to listen to when the stream gets disposed
        subscriptionStream.once('close', () => {
            console.debug('The connection for id', id, 'got closed')
            this.modelSubscriptions.delete(id, subscriptionStream)
        })
    }

    getSubscriptions(id: string): Iterable<ServerHttp2Stream> {
        return this.modelSubscriptions.get(id)
    }
}
