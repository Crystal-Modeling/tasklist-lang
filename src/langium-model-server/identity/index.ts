import type { AstNode } from 'langium'
import type * as sem from '../semantic/model'
import type { Identity, IdentityModel, IdentityName, RollbackableResult } from './model'

export type IdentityIndex = {
    readonly id: string
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}

export interface IndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> {
    allSoftDeleted(): Iterable<ID>
    values(): Iterable<ID>
    byName(name: NAME): ID | undefined
    isNameFit(name: NAME): boolean
    fitName(name: NAME): RollbackableResult<NAME> | undefined
    /**
     * Not to be used by LMS API, since it relies on name validation performed by the textual language itself
     * @returns Newly created identity
     */
    addNew(name: NAME): ID
}

export interface IdentityConstructor<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> {
    load(model: IdentityModel<NAME>): ID
}
