import * as http2 from 'http2'
import { promisify } from 'util'
import { isPromise } from 'util/types'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerAddedServices, LmsServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { CreationParams, EditingResult } from './model'
import { EditingFailureReason, Modification, Response, SemanticIdResponse } from './model'

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

        if (unmatchedPath.hasPathSegments()) {
            if (unmatchedPath.suffix === '') {
                handler = helloWorldHandler
            } else if (unmatchedPath.readPathSegment('models')) {
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
        const id = unmatchedPath.readPathSegment()
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
            const uriSegment = unmatchedPath.readPathSegment()
            if (!uriSegment) {
                return notFoundHandler
            }
            const queryParams: CreationParams = unmatchedPath.readQueryParams() ?? {}
            const facadeHandler = langiumModelServerFacade.addModelHandlersByPathSegment.get(uriSegment)
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
                const handleResult = (res: EditingResult) => {
                    if (res.successful) {
                        if (res.modified) respondWithJson(stream, res, 201)
                        else respondWithJson(stream, res, 200)
                    } else switch (res.failureReason) {
                        case EditingFailureReason.VALIDATION:
                            respondWithJson(stream, res, 400)
                            break
                        case EditingFailureReason.TEXT_EDIT:
                            respondWithJson(stream, res, 500)
                            break
                    }
                }
                if (isPromise(result)) {
                    result.then(handleResult)
                    return
                } else {
                    handleResult(result)
                }
            })
            return
        }
        const updateModelHandler: Http2RequestHandler = (stream, unmatchedPath, headers) => {
            const uriSegment = unmatchedPath.readPathSegment()
            if (!uriSegment) {
                return notFoundHandler
            }
            const updateModel = langiumModelServerFacade.updateModelHandlersByPathSegment.get(uriSegment)
            if (!updateModel) {
                return notImplementedMethodHandler
            }
            const modelId = unmatchedPath.readPathSegment()
            if (!modelId) {
                return notFoundHandler
            }
            readRequestBody(stream).then(requestBody => {
                if (!Modification.is(requestBody)) {
                    respondWithJson(stream,
                        Response.create(`${headers[':method']} ('${headers[':path']}') cannot be processed: incorrect request body`, 400))
                    return
                }
                const result = updateModel(id, modelId, requestBody)
                if (!result) {
                    respondWithJson(stream, Response.create(`Root model (document) for id '${id}' not found`, 404))
                    return
                }
                const handleResult = (res: EditingResult) => {
                    if (res.successful) {
                        if (res.modified) respondWithJson(stream, res, 200)
                        else respondWithJson(stream, res, 200)
                    } else switch (res.failureReason) {
                        case EditingFailureReason.VALIDATION:
                            respondWithJson(stream, res, 400)
                            break
                        case EditingFailureReason.TEXT_EDIT:
                            respondWithJson(stream, res, 500)
                            break
                    }
                }
                if (isPromise(result)) {
                    result.then(handleResult)
                    return
                } else {
                    handleResult(result)
                }
            })
            return
        }
        const deleteModelHandler: Http2RequestHandler = (stream, unmatchedPath) => {
            const uriSegment = unmatchedPath.readPathSegment()
            if (!uriSegment) {
                return notFoundHandler
            }
            const deleteModel = langiumModelServerFacade.deleteModelHandlersByPathSegment.get(uriSegment)
            if (!deleteModel) {
                return notImplementedMethodHandler
            }
            const modelId = unmatchedPath.readPathSegment()
            if (!modelId) {
                return notFoundHandler
            }
            const result = deleteModel(id, modelId)
            if (!result) {
                respondWithJson(stream, Response.create(`Model for rootId '${id}' and id '${modelId}' not found`, 404))
                return
            }
            const handleResult = (res: EditingResult) => {
                console.debug('Handling Editing result on Deletion', res)
                if (res.successful) {
                    if (res.modified) respondWithJson(stream, res, 200)
                    else respondWithJson(stream, res, 404)
                } else switch (res.failureReason) {
                    case EditingFailureReason.VALIDATION:
                        respondWithJson(stream, res, 400)
                        break
                    case EditingFailureReason.TEXT_EDIT:
                        respondWithJson(stream, res, 500)
                        break
                }
            }
            if (isPromise(result)) {
                console.debug('Awaiting promise result...')
                result.then(handleResult, (error) => console.error('GOT ERROR!!!', error))
                return
            } else {
                handleResult(result)
            }
            return
        }

        const subscribeToModelChangesHandler: Http2RequestHandler = (stream) => {
            console.debug(`Subscribing to the model by id '${id}'`)
            lmsSubscriptions.addSubscription(stream, id)
            setUpStreamForSSE(stream, Response.create(`Created subscription to model with id ${id}`, 201))
        }
        const updateHighlightHandler: Http2RequestHandler = (stream, unmatchedPath) => {
            const modelId = unmatchedPath.readPathSegment()
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
        if (unmatchedPath.readPathSegment('subscriptions')) {
            if (method === 'POST')
                return subscribeToModelChangesHandler
            return notImplementedMethodHandler
        }
        if (unmatchedPath.readPathSegment('highlight')) {
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
        if (method === 'PUT') {
            return updateModelHandler
        }
        if (method === 'DELETE') {
            return deleteModelHandler
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
        if (unmatchedPath.readPathSegment('id')) {
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
    console.debug('Responding with Response', response, status)
    if (!status) {
        status = (response as Response).code
    }
    stream.respond({
        [http2.constants.HTTP2_HEADER_CONTENT_TYPE]: 'application/json; charset=utf-8',
        [http2.constants.HTTP2_HEADER_STATUS]: status
    })
    if (status === 204) {
        console.warn('You are trying to send response body with NO_CONTENT HTTP status. No body will be sent since the HTTP stream is already closed')
        return
    }
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
     * Checks whether unmatched path starts with '/'
     */
    public hasPathSegments(): boolean {
        return (this.testPathSegmentSuffixMatch('') !== undefined)
    }

    /**
     * Reads segment from the beginning of the path: `/${segmentValue}`. If specified `segmentValue` equals to the segment
     * (i.e., it matches characters between the path delimimiter ('/') and another path delimiter or query character ('?') or end of the path),
     * then segmentValue is returned and matched segment is eliminated from the {@link PathContainer}.
     * If `segmentValue` is not provided, then attempts to match the path segment and return its value, also eliminating from the path.
     * If the match is unsuccessful, returns `undefined` and leaves the path unchanged.
     */
    public readPathSegment(segmentValue?: string): string | undefined {
        if (segmentValue !== undefined) {
            if (segmentValue.length === 0) {
                console.warn('Reading empty path segment (segmentValue is empty). This is most probably unintentionally')
            }
            const nextSegmentStart = this.testPathSegmentSuffixMatch(segmentValue)
            if (nextSegmentStart === undefined || !this.isPathSegmentEnd(nextSegmentStart)) {
                return undefined
            }
            this._suffix = this._suffix.substring(nextSegmentStart)
            return segmentValue
        }
        return this.matchPrefix(/^\/[^\/?]/)?.substring(1)
    }

    /**
     * Reads query params (`?param=value&otherParam=value`) from the beginning of the path
     */
    public readQueryParams(): Record<string, string | undefined> | undefined {
        const queryParamsText = this.matchPrefix(/^[?].*/)?.slice(1)
        if (!queryParamsText) return undefined
        const queryParams: Record<string, string | undefined> = {}
        queryParamsText.split('&').forEach(queryParam => {
            const assignment = queryParam.split('=', 2)
            queryParams[assignment[0]] = assignment[1]
        })
        return queryParams
    }

    /**
     * If successful, returns the index of the first unmatched character in the path after the matched path segment ('/' + segmentValue)
     * Else returns `undefined`
     */
    private testPathSegmentSuffixMatch(segmentValue: string): number | undefined {
        if (!this._suffix.startsWith('/' + segmentValue)) {
            return undefined
        }
        return segmentValue.length + 1
    }

    private isPathSegmentEnd(pathIndex: number): boolean {
        return this._suffix.length === pathIndex || this._suffix[pathIndex] === '/' || this._suffix[pathIndex] === '?'
    }

    /**
     * If {@link PathContainer}.`suffix` begins with `prefix`, then this prefix is removed from `suffix`
     * and method returns the matched prefix.
     * Otherwise {@link PathContainer} remains unmodified and method returns `undefined`.
     *
     * @param prefix A RegExp against which existing `suffix` is matched
     */
    private matchPrefix(prefix: RegExp): string | undefined {
        const matchResult = this._suffix.match(prefix)
        if (!matchResult) {
            return undefined
        }
        const prefixString = matchResult[0]
        this._suffix = this._suffix.substring(prefixString.length)
        return prefixString
    }
}
