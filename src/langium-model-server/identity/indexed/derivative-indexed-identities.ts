import type { AstNode } from 'langium'
import { ValueBasedMap } from '../../utils/collections'
import { AbstractIndexedIdentities } from './abstract-indexed-identities'
import type { Identity } from '../model'
import type { DerivativeIdentityName } from '../identity-name'
import type { ValueBasedOperations } from '../../utils/types'

export class DerivativeIndexedIdentities<T extends AstNode, NAME extends DerivativeIdentityName, ID extends Identity<T, NAME>> extends AbstractIndexedIdentities<T, NAME, ID> {

    protected override readonly _activeByName: ValueBasedMap<NAME, ID>
    protected override readonly _shadowedSoftDeletedByName: ValueBasedMap<NAME, ID>
    protected override readonly namesAreEqual: ValueBasedOperations<NAME>['equal']

    public constructor(modelUriFactory: (id: string) => string, nameOperations: ValueBasedOperations<NAME>) {
        super(modelUriFactory)
        this._activeByName = new ValueBasedMap(nameOperations.stringify)
        this._shadowedSoftDeletedByName = new ValueBasedMap(nameOperations.stringify)
        this.namesAreEqual = nameOperations.equal
    }
}
