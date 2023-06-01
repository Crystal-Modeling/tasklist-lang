import * as http2 from 'http2'
import type { LangiumModelServerAddedServices } from '../langium-model-server-module'
import { LangiumModelServerRouter } from './source-model-router'

export function startLangiumModelServer(lmsServices: LangiumModelServerAddedServices): http2.Http2Server {
    const router = LangiumModelServerRouter(lmsServices)
    return http2.createServer()
        .on('sessionError', console.error)
        .on('stream', router)
        .listen(8080)
}
