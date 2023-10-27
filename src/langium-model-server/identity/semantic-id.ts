import * as uuid from 'uuid'

export type WithSemanticID = {
    id: string
}

export namespace SemanticID {
    export function generate(): string {
        return uuid.v4()
    }
}
