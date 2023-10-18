import type { AstNode, CstNode, LangiumDocument, Reference } from 'langium'
import type * as id from '../identity/model'
import type { TypeGuard } from '../utils/types'

export type Valid<T extends AstNode | ArtificialAstNode> = T & {
    $validation: ValidationMessage[]
}

export namespace Valid {
    export function validate<T extends AstNode | ArtificialAstNode>(node: T): Valid<T> {
        const messages: ValidationMessage[] = []
        return Object.assign(node, { $validation: messages })
    }
    export function is<T extends AstNode | ArtificialAstNode>(node: T): node is Valid<T> {
        return (node as Valid<T>).$validation !== undefined
    }
}

export interface ValidationMessage {
    readonly label: string
    readonly description: string
    /**
     * Message kind, e.g., info, warning, error or custom kind
     */
    readonly kind: string
}

export type IdentifiedNode = Identified<AstNode | ArtificialAstNode, id.IdentityName>
export type Identified<T extends AstNode | ArtificialAstNode, NAME extends id.IdentityName = id.IdentityName> = Valid<T> & {
    readonly id: string
    identity: id.Identity<T, NAME>
}

export namespace Identified {
    export function identify<T extends AstNode>(node: Valid<T>, identity: id.AstNodeIdentity<T>): Identified<T, id.AstNodeIdentityName>
    export function identify<T extends ArtificialAstNode, NAME extends id.DerivativeIdentityName>(node: Valid<T>, identity: id.DerivativeSemanticIdentity<T, NAME>): Identified<T, NAME>
    export function identify<T extends AstNode | ArtificialAstNode, NAME extends id.IdentityName>(node: Valid<T>, identity: id.Identity<T, NAME>): Identified<T, NAME> {
        return Object.assign(node, { identity, id: identity.id })
    }

    export function is<T extends AstNode>(node: T): node is Identified<T, id.AstNodeIdentityName>
    export function is<T extends ArtificialAstNode>(node: T): node is Identified<T>
    export function is<T extends AstNode | ArtificialAstNode>(node: T): node is Identified<T> {
        return !!(node as Identified<T>)?.identity?.id
    }

    export function isArtificial<T extends ArtificialAstNode, NAME extends id.DerivativeIdentityName>(
        node: T, nameGuard: TypeGuard<NAME, id.IdentityName>
    ): node is Identified<T, NAME> {
        return is(node) && nameGuard(node.identity.name)
    }
}

export interface ArtificialAstNode {
    //HACK: Every Artificial AST node has a type. Should it be declared anywhere in grammar?
    readonly $type: string;
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

export type ResolvedReference<T extends AstNode> = Reference<T> & {
    ref: T
}
export namespace ResolvedReference {
    export function is<T extends AstNode>(node: Reference<T>): node is ResolvedReference<T> {
        return !!node.ref
    }
}
