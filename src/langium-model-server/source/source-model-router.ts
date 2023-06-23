import * as http2 from 'http2'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerAddedServices, LmsSourceServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import { ApiResponse, SemanticIdResponse } from './model'

type Http2RequestHandler = (stream: http2.ServerHttp2Stream, unmatchedPath: PathContainer,
    headers: http2.IncomingHttpHeaders, flags: number) => Http2RequestHandler | void
type Http2RequestHandlerProvider<T> = (parameter: T) => Http2RequestHandler

type Http2ServerRouter = (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void

export function LangiumModelServerRouter<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>(
    services: LangiumModelServerAddedServices<SM, II, D>
): Http2ServerRouter {
    return (stream, headers, flags) => {
        const unmatchedPath = new PathContainer(headers[':path'] ?? '')
        let handler: Http2RequestHandler

        if (unmatchedPath.matchPrefix('/')) {
            if (unmatchedPath.suffix === '') {
                handler = helloWorldHandler
            } else if (unmatchedPath.matchPrefix('models/')) {
                handler = provideModelHandler(services.source)
            } else {
                handler = notFoundHandler
            }
        } else {
            handler = notFoundHandler
        }

        let nextHandlerChain: Http2RequestHandler | void = handler
        while (typeof nextHandlerChain !== 'undefined') {
            nextHandlerChain = nextHandlerChain(stream, unmatchedPath, headers, flags)
        }
    }
}

const helloWorldHandler: Http2RequestHandler = (stream) => {
    stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 200
    })
    stream.end('Hello World')
}

const provideModelHandler: Http2RequestHandlerProvider<LmsSourceServices<object>> = (sourceServices) => {

    const sourceModelService = sourceServices.SourceModelService
    const sourceModelSubscriptions = sourceServices.SourceModelSubscriptions

    const modelHandler: Http2RequestHandler = (_, unmatchedPath, headers) => {
        const id = unmatchedPath.matchPrefix(/^[^\/]+/)
        if (!id) {
            return notFoundHandler
        }

        const getModelHandler: Http2RequestHandler = (stream) => {
            console.debug(`Getting the model by id '${id}'`)
            const sourceModel = sourceModelService.getById(id)

            if (!sourceModel) {
                respondWithJson(stream, ApiResponse.create(`Source model with id '${id}' not found`, 404))
            } else {
                respondWithJson(stream, sourceModel, 200)
            }
        }
        const subscribeToModelChangesHandler: Http2RequestHandler = (stream) => {
            console.debug(`Subscribing to the model by id '${id}'`)
            sourceModelSubscriptions.addSubscription(stream, id)
            setUpStreamForSSE(stream, ApiResponse.create(`Created subscription to model with id ${id}`, 201))
        }

        const method = headers[':method']
        if (unmatchedPath.matchPrefix('/subscriptions')) {
            if (method === 'POST')
                return subscribeToModelChangesHandler
            return notImplementedMethodHandler
        }
        if (method === 'GET')
            return getModelHandler
        return notImplementedMethodHandler
    }
    const getModelIdHandler: Http2RequestHandler = (stream, unmatchedPath) => {
        //HACK: LMS should be unaware of the requester. By adding dependency on GLSP Notation URI I break this (temporarily)
        const notationUri = unmatchedPath.suffix
        const semanticId = sourceModelService.getSemanticId(notationUri)

        if (!semanticId) {
            respondWithJson(stream, ApiResponse.create(`Source model sitting next to URI '${notationUri}' not found`, 404))
        } else {
            respondWithJson(stream, SemanticIdResponse.create(semanticId), 200)
        }
    }

    return (_, unmatchedPath, headers) => {
        if (unmatchedPath.matchPrefix('id/')) {
            if (headers[':method'] === 'GET')
                return getModelIdHandler
            return notImplementedMethodHandler
        }
        return modelHandler
    }
}

const notFoundHandler: Http2RequestHandler = (stream, unmatchedPath, header) => {
    respondWithJson(stream,
        ApiResponse.create(`Path '${header[':path']}' not found (unmatched suffix '${unmatchedPath.suffix}')`, 404))
}

const notImplementedMethodHandler: Http2RequestHandler = (stream, unmatchedPath, header) => {
    respondWithJson(stream,
        ApiResponse.create(`Path '${header[':path']}' is not implemented for method '${header[':method']}' (unmatched suffix '${unmatchedPath.suffix}')`, 501))
}

function respondWithJson(stream: http2.ServerHttp2Stream, response: ApiResponse): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: object, status: number): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: ApiResponse | object, status?: number): void {
    if (!status) {
        status = (response as ApiResponse).code
    }
    stream.respond({
        [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [http2.constants.HTTP2_HEADER_STATUS]: status
    })
    stream.end(JSON.stringify(response))
}

function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: ApiResponse): void
function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: object, status: number): void
function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: ApiResponse | object, status?: number): void {
    if (!status) {
        status = (response as ApiResponse).code
    }
    stream.respond({
        [http2.constants.HTTP2_HEADER_STATUS]: status,
        [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/x-ndjson',
        [http2.constants.HTTP2_HEADER_CACHE_CONTROL]: 'no-cache, no-store',
    })
    stream.write(JSON.stringify(response))
}

class PathContainer {
    private _suffix: string

    public get suffix(): string {
        return this._suffix
    }

    public constructor(suffix: string) {
        this._suffix = suffix
    }

    /**
     * If {@link PathContainer}.`suffix` begins with `prefix`, then this prefix is removed from `suffix`
     * and method returns the matched prefix.
     * Otherwise {@link PathContainer} remains unmodified and method returns `undefined`.
     *
     * @param prefix A string or RegExp against which existing `suffix` is matched
     */
    public matchPrefix(prefix: string | RegExp): string | undefined {
        let prefixString: string | undefined
        if (typeof prefix === 'string') {
            if (this._suffix.startsWith(prefix)) {
                prefixString = prefix
            }
        } else {
            const prefixRegExp = prefix.source.startsWith('^') ? prefix : new RegExp('^' + prefix.source, prefix.flags)
            const matchResult = this._suffix.match(prefixRegExp)
            if (matchResult) {
                prefixString = matchResult[0]
            }
        }
        if (prefixString !== undefined) {
            this._suffix = this._suffix.substring(prefixString.length)
            return prefixString
        }
        return undefined
    }
}
