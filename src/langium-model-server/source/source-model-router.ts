import type * as http2 from 'http2'
import type { LangiumModelServerAddedServices } from '../langium-model-server-module'
import { ApiResponse, SemanticIdResponse } from './model'
import type { SourceModelService } from './source-model-service'

type Http2RequestHandler = (stream: http2.ServerHttp2Stream, unmatchedPath: PathContainer,
    headers: http2.IncomingHttpHeaders, flags: number) => Http2RequestHandler | void
type Http2RequestHandlerProvider<T> = (parameter: T) => Http2RequestHandler
type LmsHttp2RouterProvider = (services: LangiumModelServerAddedServices) => (
    (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void
)

export const LangiumModelServerRouter: LmsHttp2RouterProvider = (services: LangiumModelServerAddedServices) => (
    (stream, headers, flags) => {
        const method = headers[':method']
        const unmatchedPath = new PathContainer(headers[':path'] ?? '')
        let handler: Http2RequestHandler

        if (unmatchedPath.matchPrefix('/')) {
            if (unmatchedPath.suffix === '') {
                handler = helloWorldHandler
            } else if (unmatchedPath.matchPrefix('models/') && method === 'GET') {
                handler = provideModelHandler(services.source.SourceModelService)
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
)

const helloWorldHandler: Http2RequestHandler = (stream) => {
    stream.respond({
        'content-type': 'text/plain; charset=utf-8',
        ':status': 200
    })
    stream.end('Hello World')
}

const provideModelHandler: Http2RequestHandlerProvider<SourceModelService<object>> = (service) => {

    const getModelIdHandler: Http2RequestHandler = (stream, unmatchedPath) => {
        //HACK: LMS should be unaware of the requester. By adding dependency on GLSP Notation URI I break this (temporarily)
        const notationUri = unmatchedPath.suffix
        const semanticId = service.getSemanticId(notationUri)

        if (!semanticId) {
            respondWithJson(stream, ApiResponse.create(`Source model sitting next to URI '${notationUri}' not found`, 404))
        } else {
            respondWithJson(stream, SemanticIdResponse.create(semanticId), 200)
        }
    }
    const getModelHandler: Http2RequestHandler = (stream, unmatchedPath) => {
        const id = unmatchedPath.suffix
        const sourceModel = service.getById(id)

        if (!sourceModel) {
            respondWithJson(stream, ApiResponse.create(`Source model with id '${id}' not found`, 404))
        } else {
            respondWithJson(stream, sourceModel, 200)
        }
    }

    return (_, unmatchedPath) => {
        if (unmatchedPath.matchPrefix('id/')) {
            return getModelIdHandler
        }
        return getModelHandler
    }
}
const notFoundHandler: Http2RequestHandler = (stream, unmatchedPath, header) => {
    respondWithJson(stream,
        ApiResponse.create(`Path '${header[':path']}' not found (unmatched suffix '${unmatchedPath.suffix}')`, 404))
}

function respondWithJson(stream: http2.ServerHttp2Stream, response: ApiResponse): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: object, status: number): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: ApiResponse | object, status?: number): void {
    if (!status) {
        status = (response as ApiResponse).code
    }
    stream.respond({
        'content-type': 'application/json; charset=utf-8',
        ':status': status
    })
    stream.end(JSON.stringify(response))
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
     * and method returns `true`.
     * Otherwise {@link PathContainer} remains unmodified and method returns `false`.
     *
     * @param prefix A string against which existing `suffix` is matched
     */
    public matchPrefix(prefix: string): boolean {
        if (this._suffix.startsWith(prefix)) {
            this._suffix = this._suffix.substring(prefix.length)
            return true
        }
        return false
    }
}
