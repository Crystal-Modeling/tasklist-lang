import * as http2 from 'http2'
import * as fs from 'fs-extra'
import type { LangiumModelServerServices } from '../services'
import { LangiumModelServerRouter } from './source-model-router'
import path from 'path'

export function startLangiumModelServer(lmsServices: LangiumModelServerServices): LangiumSourceModelServer {
    const server = lmsServices.source.LangiumSourceModelServer
    server.start(8443)
    return server
}

export class LangiumSourceModelServer {

    protected readonly http2Server: http2.Http2SecureServer

    constructor(services: LangiumModelServerServices) {
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
