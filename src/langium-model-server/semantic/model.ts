import type { AstNode, LangiumDocument, Reference } from 'langium'
import type { AstNodeIdentity, DerivativeIdentity, Identity } from '../identity/model'
import type { DerivativeIdentityName, IdentityName } from '../identity/identity-name'
import { AstNodeIdentityName } from '../identity/identity-name'
import type { WithSemanticID } from '../identity/semantic-id'
import type { KeysOfType, PickOfTypeAndOverride, TypeGuard } from '../utils/types'

export type Customized<T extends AstNode, P> = T & {
    $props: P
}

export namespace Customized {
    export function customize<T extends AstNode, P>(node: T, properties: P): Customized<T, P> {
        return Object.assign(node, { $props: properties })
    }
}

export type Validated<T extends AstNode> = T & NestedAstNodesWithValidatedContainer<T> & {
    $validation: ValidationMessage[]
}

type NestedAstNodesWithValidatedContainer<T extends AstNode> = {
    [P in KeysOfType<T, AstNode | AstNode[]>]?: T[P] extends AstNode ? T[P] & WithValidatedContainer<T> : (T[P] extends AstNode[] ? Array<T[P][0] & WithValidatedContainer<T>> : never)
}

type WithValidatedContainer<T extends AstNode> = {
    $container: Validated<T>
}

export namespace Validated {
    export function validate<T extends AstNode>(node: T): Validated<T> {
        const messages: ValidationMessage[] = []
        return Object.assign(node, { $validation: messages }) as Validated<T>
    }
    export function is<T extends AstNode>(node: T): node is Validated<T> {
        return (node as Validated<T>).$validation !== undefined
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

export type IdentifiedNode = Identified<AstNode, IdentityName>
export type Identified<T extends AstNode, NAME extends IdentityName = IdentityName> = Validated<T> & {
    $identity: Identity<T, NAME>
}

export namespace Identified {
    export function identify<T extends AstNode>(node: Validated<T>, identity: AstNodeIdentity<T>): Identified<T, AstNodeIdentityName>
    export function identify<T extends AstNode, NAME extends DerivativeIdentityName>(node: Validated<T>, identity: DerivativeIdentity<T, NAME>): Identified<T, NAME>
    export function identify<T extends AstNode, NAME extends IdentityName>(node: Validated<T>, identity: Identity<T, NAME>): Identified<T, NAME> {
        return Object.assign(node, { $identity: identity })
    }

    export function is<T extends AstNode>(node: T): node is Identified<T> {
        return (node as Identified<T>)?.$identity?.id !== undefined
    }

    export function isPrimary<T extends AstNode>(node: T): node is Identified<T, AstNodeIdentityName> {
        return is(node) && AstNodeIdentityName.is(node.$identity.name)
    }

    export function isDerivative<T extends AstNode, NAME extends DerivativeIdentityName>(
        node: T, nameGuard: TypeGuard<NAME, IdentityName>
    ): node is Identified<T, NAME> {
        return is(node) && nameGuard(node.$identity.name)
    }
}

// TODO: Suggest AstRootNode to be added to Langium grammar

export type AstRootNode<T extends AstNode = AstNode> = T & {
    readonly $document: LangiumDocument<T>
}

// TODO: Suggest ResolvedReference to be added to Langium

export type ResolvedReference<T extends AstNode> = Reference<T> & {
    ref: T
}

export namespace ResolvedReference {
    export function is<T extends AstNode>(ref: Reference<T>): ref is ResolvedReference<T> {
        return !!ref.ref
    }
}

export type ValidatedReference<T extends AstNode> = ResolvedReference<Validated<T>>

export namespace ValidatedReference {

    export function is<N extends AstNode>(ref: Reference<N>): ref is Reference<N> & ValidatedReference<N> {
        return ResolvedReference.is(ref) && Validated.is(ref.ref)
    }
}
/**
 * Describes unmapped identities for the SourceModel element of type T
 */
export type UnmappedIdentities<SM extends WithSemanticID> =
    Partial<PickOfTypeAndOverride<SM, WithSemanticID[], Iterable<Identity>>>

export namespace UnmappedIdentities {
    export function createEmpty<SM extends WithSemanticID>(): UnmappedIdentities<SM> {
        return {}
    }
}
