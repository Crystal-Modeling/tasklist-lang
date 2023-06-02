import * as http2 from 'http2'
import * as fs from 'fs-extra'
import type { LangiumModelServerAddedServices } from '../langium-model-server-module'
import { LangiumModelServerRouter } from './source-model-router'
import path from 'path'

export function startLangiumModelServer(lmsServices: LangiumModelServerAddedServices): http2.Http2Server {
    const router = LangiumModelServerRouter(lmsServices)
    const keyPath = path.join(__dirname, '../../ssl/key.pem')
    const certPath = path.join(__dirname, '../../ssl/cert.pem')
    console.debug('Trying to load SSL files from', keyPath, certPath)

    return http2.createSecureServer({
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    })
        .on('sessionError', console.error)
        .on('stream', router)
        .listen(8443)
}
