import * as fs from 'fs-extra'
import * as http2 from 'http2'
import path from 'path'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import { LangiumModelServerRouter } from './source-model-router'

export function startLangiumModelServer
<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>(lmsServices: LangiumModelServerServices<SM, II, D>):
LangiumSourceModelServer<SM, II, D> {
    const server = lmsServices.source.LangiumSourceModelServer
    server.start(8443)
    return server
}

export class LangiumSourceModelServer<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> {

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
    }

    public start(port: number): void {
        this.http2Server.listen(port)
    }

    public shutDown(callback?: (err?: Error | undefined) => void): void {
        this.http2Server.close(callback)
    }
}
