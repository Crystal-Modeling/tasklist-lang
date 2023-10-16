import type { AstNode } from 'langium'
import type * as sem from '../semantic/model'
import type { Identity, IdentityName, RollbackableResult } from './model'

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
    fitName(name: NAME): RollbackableResult<NAME> | undefined
    addNew(name: NAME): ID
    add(id: string, name: NAME): ID
}
