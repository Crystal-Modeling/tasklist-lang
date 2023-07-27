import type { AstNode } from 'langium'
import type { SemanticIdentity } from './identity'

export type Valid<T> = T & { __semantic: 'valid' }

export type Identified<T> = Valid<T> & SemanticIdentity

export namespace Identified {
    export function identify<T extends AstNode>(node: Valid<T>, semanticId: string): Identified<T> {
        return Object.assign(node, {id: semanticId })
    }

    export function is<T extends AstNode>(node: T): node is Identified<T> {
        return !!(node as Identified<T>).id
    }
}
