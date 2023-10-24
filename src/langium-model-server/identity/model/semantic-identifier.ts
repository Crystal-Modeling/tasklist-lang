import * as uuid from 'uuid'

export type SemanticIdentifier = {
    id: string
}

export namespace SemanticIdentifier {
    export function generate(): string {
        return uuid.v4()
    }
}
