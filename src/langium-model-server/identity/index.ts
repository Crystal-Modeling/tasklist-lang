import type { AstNodeSemanticIdentity, Indexed } from './model'

export type IdentityIndex = {
    readonly id: string
    findAstNodeIdentityById(id: string): Indexed<AstNodeSemanticIdentity> | undefined
    // findDerivedIdentityById<T extends SemanticIdentity, NAME extends SemanticDerivativeName>(id: string, nameBuilder: SemanticNameBuilder<T, NAME>): Renameable<DerivativeSemanticIdentity<NAME>> | undefined
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
