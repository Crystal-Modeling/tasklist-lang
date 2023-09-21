import * as http2 from 'http2'
import { promisify } from 'util'
import type { Response } from '../model'

export function readRequestBody(stream: http2.ServerHttp2Stream): Promise<object> {
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

export function respondWithJson(stream: http2.ServerHttp2Stream, response: Response): void
export function respondWithJson(stream: http2.ServerHttp2Stream, response: object, status: number): void
export function respondWithJson(stream: http2.ServerHttp2Stream, response: Response | object, status?: number): void {
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

export function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: Response): void
export function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: object, status: number): void
export function setUpStreamForSSE(stream: http2.ServerHttp2Stream, response: Response | object, status?: number): void {
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
