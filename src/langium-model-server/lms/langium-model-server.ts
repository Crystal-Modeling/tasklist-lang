import * as fs from 'fs-extra'
import * as http2 from 'http2'
import path from 'path'
import type { WithSemanticID } from '../identity/semantic-id'
import type { IdentityIndex } from '../identity/indexed'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import { LangiumModelServerRouter } from './router'

export function startLangiumModelServer<
    SM extends WithSemanticID,
    II extends IdentityIndex,
    D extends LmsDocument
>(lmsServices: LangiumModelServerServices<SM, II, D>): LangiumModelServer {
    const server = lmsServices.lms.LangiumModelServer
    server.start(8443)
    return server
}

export interface LangiumModelServer {
    start(port: number): void
    shutDown(callback?: (err?: Error | undefined) => void): void
}

export class DefaultLangiumSourceModelServer<SM extends WithSemanticID, II extends IdentityIndex, D extends LmsDocument> implements LangiumModelServer {

    protected readonly http2Server: http2.Http2SecureServer

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        const keyPath = path.join(__dirname, '../../ssl/key.pem')
        const certPath = path.join(__dirname, '../../ssl/cert.pem')
        const router = LangiumModelServerRouter(services)
        console.debug('Trying to load SSL files from', keyPath, certPath)

        this.http2Server = http2.createSecureServer({
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        })
            .on('sessionError', console.error)
            .on('stream', router)
            // NOTE: The following request configuration I found on GitHub for http2 SSE servers. Not sure if they are really mandatory.
            // Commented out because they break single-responsibility (both router and server are now aware of server routes).
            // See https://github.com/tinovyatkin/http2-sse-server/blob/ba7512cff9abf8f863742b84fcc5eea159d84567/src/server.js#L46C12-L51
            // .on('request', (req) => {
            //     if (req.headers[':method'] === 'POST' && req.headers[':path']?.match(/^\/models\/[^\/]*\/subscriptions/)) {
            //         console.debug('Model subscription request:', req.headers[':method'], req.headers[':path'],)
            //         req.socket.setTimeout(0)
            //         req.socket.setNoDelay(true)
            //         req.socket.setKeepAlive(true)
            //     }
            // })
    }

    public start(port: number): void {
        this.http2Server.listen(port)
    }

    public shutDown(callback?: (err?: Error | undefined) => void): void {
        console.debug('Shutting Down LMS server...')
        this.http2Server.close(callback)
    }
}
