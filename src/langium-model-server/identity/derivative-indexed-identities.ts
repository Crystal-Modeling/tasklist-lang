import type { AstNode } from 'langium'
import type * as sem from '../semantic/model'
import { ValueBasedMap, equal } from '../utils/collections'
import { AbstractIndexedIdentities } from './abstract-indexed-identities'
import type { DerivativeIdentityName, Identity } from './model'

export class DerivativeIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends DerivativeIdentityName, ID extends Identity<T, NAME>> extends AbstractIndexedIdentities<T, NAME, ID> {

    protected override readonly _activeByName = new ValueBasedMap<NAME, ID>()
    protected override readonly _shadowedSoftDeletedByName = new ValueBasedMap<NAME, ID>()

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return equal(left, right)
    }
}
