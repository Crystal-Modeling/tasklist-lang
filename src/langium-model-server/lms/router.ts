import type * as http2 from 'http2'
import { isPromise } from 'util/types'
import type { IdentityIndex } from '../identity'
import type { SemanticIdentifier } from '../identity/model'
import type { LangiumModelServerAddedServices, LmsServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { CreationParams, ModificationResult } from './model'
import { EditingFailureReason, Modification, Response, SemanticIdResponse } from './model'
import { PathContainer } from './utils/path-container'
import { readRequestBody, respondWithJson, setUpStreamForSSE } from './utils/http2-util'
import { isArray } from '../utils/types'

type Http2RequestHandler = (stream: http2.ServerHttp2Stream, unmatchedPath: PathContainer,
    headers: http2.IncomingHttpHeaders, flags: number) => Http2RequestHandler | void
type Http2RequestHandlerProvider<T> = (parameter: T) => Http2RequestHandler

type Http2ServerRouter = (stream: http2.ServerHttp2Stream, headers: http2.IncomingHttpHeaders, flags: number) => void

export function LangiumModelServerRouter<SM extends SemanticIdentifier, II extends IdentityIndex<SM>, D extends LmsDocument>(
    services: LangiumModelServerAddedServices<SM, II, D>
): Http2ServerRouter {
    return (stream, headers, flags) => {
        const unmatchedPath = new PathContainer(headers[':path'] ?? '')
        let handler: Http2RequestHandler

        if (unmatchedPath.hasPathSegments()) {
            if (unmatchedPath.readPathSegment('models')) {
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

const provideModelHandler: Http2RequestHandlerProvider<LmsServices<SemanticIdentifier>> = (sourceServices) => {

    const langiumModelServerFacade = sourceServices.LangiumModelServerFacade
    const lmsSubscriptions = sourceServices.LmsSubscriptions

    const modelHandler: Http2RequestHandler = (stream, unmatchedPath, headers) => {
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
                const handleResult = (res: ModificationResult) => {
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
                return deleteModelsHandler
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
                const handleResult = (res: ModificationResult) => {
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

        const handleDeletionResult = (res: ModificationResult) => {
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
        const deleteModelsHandler: Http2RequestHandler = (stream) => {
            readRequestBody(stream).then(requestBody => {
                if (!isArray(requestBody, (obj): obj is string => typeof obj === 'string')) {
                    respondWithJson(stream,
                        Response.create(`${headers[':method']} ('${headers[':path']}') cannot be processed: incorrect request body`, 400))
                    return
                }
                const result = langiumModelServerFacade.deleteModels(id, requestBody)
                if (!result) {
                    respondWithJson(stream, Response.create(`Root model (document) for id '${id}' not found`, 404))
                    return
                }
                if (isPromise(result)) {
                    result.then(handleDeletionResult)
                    return
                } else {
                    handleDeletionResult(result)
                }
            })
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
            if (isPromise(result)) {
                console.debug('Awaiting promise result...')
                result.then(handleDeletionResult, (error) => console.error('GOT ERROR!!!', error))
                return
            } else {
                handleDeletionResult(result)
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

        const persistModelHandler: Http2RequestHandler = (stream) => {
            const result = langiumModelServerFacade.persist(id)

            if (!isPromise(result)) return notFoundHandler
            result.then((success) => {
                success ? respondWithJson(stream, Response.create('Executed Model Persist action', 200))
                    : respondWithJson(stream, Response.create('Failed to execute Model Persist action', 500))
            })
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
        if (unmatchedPath.readPathSegment('persist')) {
            if (method === 'PUT')
                return persistModelHandler
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
        const notationUri: string | undefined = unmatchedPath.readQueryParams()?.uri
        if (!notationUri) {
            return notFoundHandler
        }
        const semanticId = langiumModelServerFacade.getSemanticId(notationUri)

        if (!semanticId) {
            respondWithJson(stream, Response.create(`Source model sitting next to URI '${notationUri}' not found`, 404))
        } else {
            respondWithJson(stream, SemanticIdResponse.create(semanticId), 200)
        }
        return
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
