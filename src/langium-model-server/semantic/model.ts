import type { AstNode, Reference } from 'langium'
import type { SemanticIdentity } from './identity'

export type ArrayAware<T> = { el: T, index: number }

export type ResolvedReference<T extends AstNode> = Reference<T> & {
    ref: T
}
export namespace ResolvedReference {
    export function is<T extends AstNode>(node: Reference<T>): node is ResolvedReference<T> {
        return !!node.ref
    }
}

export type Valid<T> = T & { __semantic: 'valid' }

export type Identified<T> = Valid<T> & SemanticIdentity

export namespace Identified {
    export function identify<T>(node: Valid<T>, semanticId: string): Identified<T> {
        return Object.assign(node, {id: semanticId })
    }

    export function is<T>(node: T): node is Identified<T> {
        return !!(node as SemanticIdentity).id
    }
}
