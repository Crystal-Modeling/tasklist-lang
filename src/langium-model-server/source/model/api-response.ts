
export interface ApiResponse {
    code: number
    type: string
    message: string
}

export namespace ApiResponse {

    export function create(message: string, code: 404): ApiResponse {
        return {
            code: code,
            type: 'NOT_FOUND',
            message
        }
    }
}
