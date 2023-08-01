export interface SemanticIdResponse {
    id: string
}

export namespace SemanticIdResponse {
    export function create(semanticId: string): SemanticIdResponse {
        return { id: semanticId }
    }
}
