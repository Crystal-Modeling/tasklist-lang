import type { AstNode, CstNode, LangiumDocument, Reference } from 'langium'
import type { SemanticIdentity } from './identity'

export type Valid<T> = T & { __semantic: 'valid' }

export type Identified<T> = Valid<T> & SemanticIdentity

export namespace Identified {
    export function identify<T>(node: Valid<T>, semanticId: string): Identified<T> {
        return Object.assign(node, { id: semanticId })
    }

    export function is<T>(node: T): node is Identified<T> {
        return !!(node as SemanticIdentity).id
    }
}

export interface ArtificialAstNode {
    readonly $cstNode?: CstNode
}

export type AstRootNode = Valid<AstNode> & {
    readonly $document: LangiumDocument
}

export namespace AstRootNode {
    export function create(astNode: AstNode): AstRootNode | undefined {
        if (!astNode.$document) {
            return undefined
        }
        return astNode as AstRootNode
    }
}

export type ResolvedReference<T extends AstNode> = Reference<T> & {
    ref: T
}
export namespace ResolvedReference {
    export function is<T extends AstNode>(node: Reference<T>): node is ResolvedReference<T> {
        return !!node.ref
    }
}
