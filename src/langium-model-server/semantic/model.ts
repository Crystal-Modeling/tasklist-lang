import type { SemanticIdentity } from './identity'

export type Valid<T> = T & { __semantic: 'valid' }

export type Identified<T> = Valid<T> & SemanticIdentity

export namespace Identified {
    export function identify<T>(node: Valid<T>, semanticId: string): Identified<T> {
        return Object.assign(node, {id: semanticId })
    }
}
