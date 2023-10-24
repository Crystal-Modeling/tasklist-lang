import type { AstNode } from 'langium'
import { MultiMap } from 'langium'
import type * as sem from '../../semantic/model'
import { AbstractIndexedIdentities } from './abstract-indexed-identities'
import type { AstNodeIdentityName, EditableIdentity, Identity, RollbackableResult, StateRollback } from '../model'

export class AstNodeIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, ID extends Identity<T, AstNodeIdentityName>> extends AbstractIndexedIdentities<T, AstNodeIdentityName, ID> {

    private static readonly ILLEGAL_NAME_CHAR = ' '
    private static readonly SEPARATOR = '_'

    protected override readonly _activeByName: Map<AstNodeIdentityName, ID> = new Map()
    protected override readonly _shadowedSoftDeletedByName: Map<AstNodeIdentityName, ID> = new Map()
    protected override namesAreEqual = (left: AstNodeIdentityName, right: AstNodeIdentityName) => (left === right)
    protected readonly _nameDuplicates: MultiMap<AstNodeIdentityName, AstNodeIdentityName> = new MultiMap()

    protected override isNewNameFitForIdentity(identity: ID & EditableIdentity<T, AstNodeIdentityName>, newName: AstNodeIdentityName): boolean {
        return this.namesAreEqual(identity.name, newName)
            || this.isNameFit(newName)
            || this._nameDuplicates.get(newName).at(-1) === identity.name // Old name is last duplicate for new name
    }

    protected override fitNameForIdentity(identity: ID & EditableIdentity<T, string>, newName: string): RollbackableResult<string> | undefined {
        const normalizedName = newName.replace(AstNodeIndexedIdentities.ILLEGAL_NAME_CHAR, AstNodeIndexedIdentities.SEPARATOR)
        return super.fitNameForIdentity(identity, normalizedName)
    }

    protected override doRenameIdentity(identity: ID & EditableIdentity<T, AstNodeIdentityName>, newName: AstNodeIdentityName): StateRollback | undefined {
        const oldName = identity.name
        this._activeByName.delete(oldName)
        const existingIdentityByNewName = this._activeByName.get(newName)
        if (existingIdentityByNewName) { // Active identities already have another identity with name=`newName`. This another identity is soft-deleted (otherwise we would exit with `undefined` when checking `this.hasNonDeletedNode` earlier)
            this._shadowedSoftDeletedByName.set(newName, existingIdentityByNewName)
        }
        const originalName = this.removeDuplicateName(oldName)
        this._activeByName.set(newName, identity)

        identity.name = newName

        return () => {
            identity.name = oldName
            this._activeByName.delete(newName)
            if (existingIdentityByNewName) {
                this._shadowedSoftDeletedByName.delete(newName)
                this._activeByName.set(newName, existingIdentityByNewName)
            }
            if (originalName) {
                this._nameDuplicates.add(originalName, oldName)
            }
            this._activeByName.set(oldName, identity)
        }
    }

    public override fitName(name: AstNodeIdentityName): RollbackableResult<AstNodeIdentityName> | undefined {
        const normalizedName = name.replace(AstNodeIndexedIdentities.ILLEGAL_NAME_CHAR, AstNodeIndexedIdentities.SEPARATOR)
        return super.fitName(normalizedName)
    }

    public override isNameFit(name: AstNodeIdentityName): boolean {
        return !this.hasActiveNode(name) && !name.includes(AstNodeIndexedIdentities.ILLEGAL_NAME_CHAR)
    }

    protected override fitUnfittedName(name: string): RollbackableResult<string> | undefined {
        return this.makeNameUnique(name)
    }

    protected override softDeleteIdentity(identity: ID & EditableIdentity<T, string>, deletedSemanticModel?: sem.Identified<T, AstNodeIdentityName>): void {
        super.softDeleteIdentity(identity, deletedSemanticModel)
        this.removeDuplicateName(identity.name)
    }

    /**
     * @param name identity name which should be removed from the duplicates list
     * @returns `originalName` if it existed and [`originalName`, `name`] was removed from the duplicates multimap. Otherwise returns `undefined`
     */
    private removeDuplicateName(name: AstNodeIdentityName): string | undefined {
        const originalName = name.substring(0, name.lastIndexOf(AstNodeIndexedIdentities.SEPARATOR))
        if (this._nameDuplicates.delete(originalName, name)) {
            return originalName
        }
        return undefined
    }

    private makeNameUnique(name: AstNodeIdentityName): RollbackableResult<AstNodeIdentityName> {
        const lastDuplicate = this._nameDuplicates.get(name).at(-1)
        let maxNumber: number
        if (lastDuplicate) {
            maxNumber = Number.parseInt(lastDuplicate.substring(lastDuplicate.lastIndexOf(AstNodeIndexedIdentities.SEPARATOR) + 1)) || 1
        } else {
            maxNumber = 1
        }
        let newName: string
        do {
            newName = name + '_' + ++maxNumber
            this._nameDuplicates.add(name, newName)
        } while (this.hasActiveNode(newName))

        return {
            result: newName,
            rollback: () => this._nameDuplicates.delete(name, newName)
        }

    }
}
