import type { AstNodeSemanticIdentity, Renameable } from './identity'

export type IdentityIndex = {
    readonly id: string
    findAstNodeIdentityById(id: string): Renameable<AstNodeSemanticIdentity> | undefined
    // findDerivedIdentityById<T extends SemanticIdentity, NAME extends SemanticDerivativeName>(id: string, nameBuilder: SemanticNameBuilder<T, NAME>): Renameable<DerivativeSemanticIdentity<NAME>> | undefined
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
