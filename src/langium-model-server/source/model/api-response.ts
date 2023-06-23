
export interface ApiResponse {
    code: number
    type: string
    message: string
}

export namespace ApiResponse {

    export function create(message: string, code: 404 | 501 | 201): ApiResponse {
        let type: string
        switch (code) {
            case 404: type = 'NOT_FOUND'
                break
            case 501: type = 'NOT_IMPLEMENTED'
                break
            case 201: type = 'CREATED'
                break
        }
        return {
            code: code,
            type,
            message
        }
    }
}
