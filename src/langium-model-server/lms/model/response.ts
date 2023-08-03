
export interface Response {
    code: number
    type: string
    message: string
}

export namespace Response {

    export function create(message: string, code: 400 | 404 | 501 | 201 | 200 | 500): Response {
        let type: string
        switch (code) {
            case 400: type = 'BAD_REQUEST'
                break
            case 404: type = 'NOT_FOUND'
                break
            case 501: type = 'NOT_IMPLEMENTED'
                break
            case 201: type = 'CREATED'
                break
            case 200: type = 'OK'
                break
            case 500: type = 'INTERNAL_SERVER_ERROR'
                break
        }
        return {
            code: code,
            type,
            message
        }
    }
}
