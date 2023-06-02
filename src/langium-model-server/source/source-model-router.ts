import type * as http2 from 'http2'
import type { LangiumModelServerAddedServices } from '../langium-model-server-module'
import { ApiResponse } from './model'
import type { SourceModelService } from './source-model-service'

type UnmatchedPathContainer = { suffix: string }
type Http2RequestHandler = (stream: http2.ServerHttp2Stream, unmatchedPath: UnmatchedPathContainer,
    headers: http2.IncomingHttpHeaders, flags: number) => Http2RequestHandler | void
type Http2RequestHandlerProvider<T> = (parameter: T) => Http2RequestHandler
type LmsHttp2RouterProvider = (services: LangiumModelServerAddedServices) => (
    (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void
)

export const LangiumModelServerRouter: LmsHttp2RouterProvider = (services: LangiumModelServerAddedServices) => (
    (stream, headers, flags) => {
        const method = headers[':method']
        const unmatchedPath = { suffix: headers[':path'] ?? '' }
        let handler: Http2RequestHandler

        if (matchPrefix('/', unmatchedPath)) {
            if (unmatchedPath.suffix === '') {
                handler = helloWorldHandler
            } else if (matchPrefix('models/', unmatchedPath) && method === 'GET') {
                handler = getModelHandlerProvider(services.source.SourceModelService)
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

const getModelHandlerProvider: Http2RequestHandlerProvider<SourceModelService<object>> = (service) => (
    (stream, unmatchedPath) => {
        const id = unmatchedPath.suffix
        const sourceModel = service.getById(id)

        if (!sourceModel) {
            respondWithJson(stream, ApiResponse.create(`Source model with id '${id}' not found`, 404))
        } else {
            respondWithJson(stream, sourceModel, 200)
        }
    }
)

const notFoundHandler: Http2RequestHandler = (stream, unmatchedPath, header) => {
    respondWithJson(stream,
        ApiResponse.create(`Path '${header[':path']}' not found (unmatched suffix '${unmatchedPath.suffix}')`, 404))
}

/**
 * If `pathContainer`.`suffix` begins with `prefix`, then this prefix is removed from `suffix`
 * and the function returns `true`. Otherwise `pathContainer` remains unmodified and the function returns `false`.
 *
 * @param prefix A string against which existing `suffix` is matched
 * @param pathContainer Object holding a reference to resulting path suffix
 */
function matchPrefix(prefix: string, pathContainer: { suffix: string }): boolean {
    if (pathContainer.suffix.startsWith(prefix)) {
        pathContainer.suffix = pathContainer.suffix.substring(prefix.length)
        return true
    }
    return false
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
