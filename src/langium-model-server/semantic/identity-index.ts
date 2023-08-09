import type { RenameableSemanticIdentity, SemanticPropertyName } from './identity'

export type IdentityIndex = {
    readonly id: string
    findIdentityById(id: string): RenameableSemanticIdentity<SemanticPropertyName> | undefined
    // findDerivedIdentityById<T extends SemanticIdentity, NAME extends SemanticDerivativeName>(id: string, nameBuilder: SemanticNameBuilder<T, NAME>): RenameableSemanticIdentity<NAME> | undefined
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
