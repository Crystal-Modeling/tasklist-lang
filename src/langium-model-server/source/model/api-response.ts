
export interface ApiResponse {
    code: number
    type: string
    message: string
}

export namespace ApiResponse {

    export function create(message: string, code: 404 | 501): ApiResponse {
        return {
            code: code,
            type: code === 404 ? 'NOT_FOUND' : 'NOT_IMPLEMENTED',
            message
        }
    }
}
