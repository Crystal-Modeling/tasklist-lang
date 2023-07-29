
export type HighlightResponse = {
    documentId: string,
    modelId?: string,
    highlighted: boolean
}

export namespace HighlightResponse {

    export function documentHighlighted(documentId: string, highlighted: boolean): HighlightResponse {
        return { documentId, highlighted }
    }

    export function modelHighlighted(documentId: string, modelId: string, highlighted: boolean): HighlightResponse {
        return { documentId, modelId, highlighted }
    }
}
