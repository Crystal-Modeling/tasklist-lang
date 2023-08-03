import * as http2 from 'http2'
import { promisify } from 'util'
import { isPromise } from 'util/types'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerAddedServices, LmsServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { CreationParams} from './model'
import { EditingFailureReason, Response, SemanticIdResponse } from './model'

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
                handler = provideModelHandler(services.lms)
            } else {
                handler = notFoundHandler
            }
        } else {
            handler = notFoundHandler
        }

        try {
            let nextHandlerChain: Http2RequestHandler | void = handler
            while (typeof nextHandlerChain !== 'undefined') {
                nextHandlerChain = nextHandlerChain(stream, unmatchedPath, headers, flags)
            }
        } catch (error) {
            if (error instanceof Error) {
                respondWithJson(stream, Response.create(error.message, 500))
            } else {
                respondWithJson(stream, Response.create('Unexpected server error', 500))
            }
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

const provideModelHandler: Http2RequestHandlerProvider<LmsServices<object>> = (sourceServices) => {

    const langiumModelServerFacade = sourceServices.LangiumModelServerFacade
    const lmsSubscriptions = sourceServices.LmsSubscriptions

    const modelHandler: Http2RequestHandler = (_, unmatchedPath, headers) => {
        const id = unmatchedPath.matchPrefix(/^[^\/]+/)
        if (!id) {
            return notFoundHandler
        }

        const getModelHandler: Http2RequestHandler = (stream) => {
            console.debug(`Getting the model by id '${id}'`)
            const sourceModel = langiumModelServerFacade.getById(id)

            if (!sourceModel) {
                respondWithJson(stream, Response.create(`Source model with id '${id}' not found`, 404))
            } else {
                respondWithJson(stream, sourceModel, 200)
            }
        }
        const addModelHandler: Http2RequestHandler = (stream, unmatchedPath, headers) => {
            const uriSegment = unmatchedPath.matchPrefix(/^\/[^?]+/)
            if (!uriSegment) {
                return notFoundHandler
            }
            const queryParams: CreationParams = unmatchedPath.parseQueryParams() ?? {}
            const facadeHandler = langiumModelServerFacade.addModelHandlersByUriSegment.get(uriSegment)
            if (!facadeHandler) {
                return notImplementedMethodHandler
            }
            readRequestBody(stream).then(requestBody => {
                if (!facadeHandler.isApplicable(requestBody)) {
                    respondWithJson(stream,
                        Response.create(`${headers[':method']} ('${headers[':path']}') cannot be processed: incorrect request body`, 400))
                    return
                }
                const result = facadeHandler.addModel(id, requestBody, queryParams)
                if (!result) {
                    respondWithJson(stream, Response.create(`Root model (document) for id '${id}' not found`, 404))
                    return
                }
                if (isPromise(result)) {
                    result.then(res => {
                        if (res.successful) {
                            respondWithJson(stream, res, 201)
                        } else switch (res.failureReason) {
                            case EditingFailureReason.VALIDATION:
                                respondWithJson(stream, res, 400)
                                break
                            case EditingFailureReason.TEXT_EDIT:
                                respondWithJson(stream, res, 500)
                                break
                        }
                    })
                    return
                }
            })
            return
        }

        const subscribeToModelChangesHandler: Http2RequestHandler = (stream) => {
            console.debug(`Subscribing to the model by id '${id}'`)
            lmsSubscriptions.addSubscription(stream, id)
            setUpStreamForSSE(stream, Response.create(`Created subscription to model with id ${id}`, 201))
        }
        const updateHighlightHandler: Http2RequestHandler = (stream, unmatchedPath) => {
            const modelId = unmatchedPath.matchPrefix(/^[^\/]+/)
            if (!modelId) {
                return notFoundHandler
            }
            const highlightResponse = langiumModelServerFacade.highlight(id, modelId)

            if (!isPromise(highlightResponse) && !highlightResponse.highlighted) {
                respondWithJson(stream, highlightResponse, 404)
            } else {
                Promise.resolve(highlightResponse).then(highlight => respondWithJson(stream, highlight, 200))
            }
            return
        }

        const method = headers[':method']
        if (unmatchedPath.matchPrefix('/subscriptions')) {
            if (method === 'POST')
                return subscribeToModelChangesHandler
            return notImplementedMethodHandler
        }
        if (unmatchedPath.matchPrefix('/highlight/')) {
            if (method === 'PUT')
                return updateHighlightHandler
            return notImplementedMethodHandler
        }
        if (method === 'GET')
            return getModelHandler
        if (method === 'POST') {
            // NOTE: Since in the future models (and their APIs) will be generated, they cannot be named as:
            //   1. Subscription
            //   2. Highlight (?)
            return addModelHandler
        }
        return notImplementedMethodHandler
    }
    const getModelIdHandler: Http2RequestHandler = (stream, unmatchedPath) => {
        //HACK: LMS should be unaware of the requester. By adding dependency on GLSP Notation URI I break this (temporarily)
        const notationUri = unmatchedPath.suffix
        const semanticId = langiumModelServerFacade.getSemanticId(notationUri)

        if (!semanticId) {
            respondWithJson(stream, Response.create(`Source model sitting next to URI '${notationUri}' not found`, 404))
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
        Response.create(`Path '${header[':path']}' not found (unmatched suffix '${unmatchedPath.suffix}')`, 404))
}

const notImplementedMethodHandler: Http2RequestHandler = (stream, unmatchedPath, header) => {
    respondWithJson(stream,
        Response.create(`Path '${header[':path']}' is not implemented for method '${header[':method']}' (unmatched suffix '${unmatchedPath.suffix}')`, 501))
}

function readRequestBody(stream: http2.ServerHttp2Stream): Promise<object> {
    const buffers: Array<Buffer | string> = []

    stream.on('data', chunk => {
        buffers.push(chunk)
    })

    return promisify(stream.once.bind(stream))('end')
        .then(() => {
            const joined = buffers.join()
            console.debug('The stream ended. Joined first buffer', joined)
            const parsed = JSON.parse(joined)
            console.debug('Parsed response body', parsed)
            return parsed
        })
}

function respondWithJson(stream: http2.ServerHttp2Stream, response: Response): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: object, status: number): void
function respondWithJson(stream: http2.ServerHttp2Stream, response: Response | object, status?: number): void {
    if (!status) {
        status = (response as Response).code
    }
    stream.respond({
        [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [http2.constants.HTTP2_HEADER_STATUS]: status
    })
    stream.end(JSON.stringify(response))
}

function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: Response): void
function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: object, status: number): void
function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: Response | object, status?: number): void {
    if (!status) {
        status = (response as Response).code
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

    public parseQueryParams(): Record<string, string | undefined> | undefined {
        const queryParamsText = this.matchPrefix(/^[?].+/)
        if (!queryParamsText) return undefined
        const queryParams: Record<string, string | undefined> = {}
        queryParamsText.slice(1).split('&').forEach(queryParam => {
            const assignment = queryParam.split('=', 2)
            queryParams[assignment[0]] = assignment[1]
        })
        return queryParams
    }
}
