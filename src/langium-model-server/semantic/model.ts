import type { AstNode, CstNode, LangiumDocument, Reference } from 'langium'
import type { AstNodeSemanticIdentity, DerivativeSemanticIdentity, Indexed, IndexedIdentity } from '../identity/model'

export type Valid<T> = T & { __semantic: 'valid' }

export type IdentifiedRoot<T extends AstRootNode = AstRootNode> = T & {
    readonly id: string
}

export type IdentifiedNode = Identified<AstNode | ArtificialAstNode>
export type Identified<T extends AstNode | ArtificialAstNode> = Valid<T> & {
    readonly id: string
    identity: T extends AstNode ? Indexed<AstNodeSemanticIdentity> : Indexed<DerivativeSemanticIdentity>
}

export namespace Identified {
    export function identify<T extends AstNode>(node: Valid<T>, identity: Indexed<AstNodeSemanticIdentity>): Identified<T>
    export function identify<T extends ArtificialAstNode>(node: Valid<T>, identity: Indexed<DerivativeSemanticIdentity>): Identified<T>
    export function identify<T extends AstNode | ArtificialAstNode>(node: Valid<T>, identity: IndexedIdentity): Identified<T> {
        return Object.assign(node, { identity, id: identity.id }) as Identified<T>
    }

    export function identifyRoot<T extends AstRootNode>(root: T, id: string): IdentifiedRoot<T> {
        return Object.assign(root, { id })
    }

    export function is<T extends AstNode | ArtificialAstNode>(node: T): node is Identified<T> {
        return !!(node as Identified<T>)?.identity?.id
    }

    export function isRoot<T extends AstRootNode>(root: T): root is IdentifiedRoot<T> {
        return !!(root as IdentifiedRoot<T>)?.id
    }
}

export interface ArtificialAstNode {
    readonly $container: AstNode | ArtificialAstNode
    readonly $containerProperty: string
    readonly $containerIndex?: number
    readonly $cstNode?: CstNode
}

export type ArtificialIndexedAstNode = ArtificialAstNode & {
    readonly $containerIndex: number
}

export type AstRootNode<T extends AstNode = AstNode> = T & {
    readonly $document: LangiumDocument<T>
}

export namespace AstRootNode {
    export function is(astNode: AstNode): astNode is AstRootNode {
        return !!astNode.$document
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
