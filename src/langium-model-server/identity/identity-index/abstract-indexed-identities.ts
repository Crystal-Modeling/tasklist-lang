import type { AstNode } from 'langium'
import type * as sem from '../../semantic/model'
import type { AbstractMap } from '../../utils/collections'
import type { EditableIdentity, Identity, IdentityModel, IdentityName, RollbackableResult, StateRollback } from '../model'
import { SemanticIdentifier } from '../model'
import type { IdentityConstructor, IndexedIdentities } from './identity-index'

export abstract class AbstractIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> implements IndexedIdentities<T, NAME, ID>, IdentityConstructor<T, NAME, ID> {

    protected static readonly NO_OP = () => { }

    protected readonly _allById: Map<string, ID> = new Map()
    protected abstract readonly _activeByName: AbstractMap<NAME, ID>
    /**
    * Soft-deleted identities, which are "shadowed away" by active (i.e., not deleted) identities with the same name.
    * This can happen, if an active identity name is changed to the same a soft-deleted one has.
    */
    protected abstract readonly _shadowedSoftDeletedByName: AbstractMap<NAME, ID>
    protected abstract readonly namesAreEqual: (left: NAME, right: NAME) => boolean
    protected readonly _allSoftDeletedById: Map<string, ID> = new Map()
    protected readonly modelUriFactory: (id: string) => string

    public constructor(modelUriFactory: (id: string) => string) {
        this.modelUriFactory = modelUriFactory
    }

    public allSoftDeleted(): Iterable<ID> {
        return this._allSoftDeletedById.values()
    }

    public values(): Iterable<ID> {
        return this._allById.values()
    }

    public byName(name: NAME): ID | undefined {
        // TODO: Performance overload here: when name is a string array, key concatenation can be performed twice uselessly
        return this._activeByName.get(name) ?? this._shadowedSoftDeletedByName.get(name)
    }

    public isNameFit(name: NAME): boolean {
        return !this.hasActiveNode(name)
    }

    // HACK: This implementation seems to be rather non-unuseful?
    public fitName(name: NAME): RollbackableResult<NAME> | undefined {
        if (this.isNameFit(name)) {
            return {
                result: name,
                rollback: AbstractIndexedIdentities.NO_OP
            }
        }
        return this.fitUnfittedName(name)
    }

    public addNew(name: NAME): ID {
        return this.add(SemanticIdentifier.generate(), name)
    }

    public load(model: IdentityModel<NAME>): ID {
        return this.add(model.id, model.name)
    }

    protected add(id: string, name: NAME): ID {
        const index = this
        let identity: ID & EditableIdentity<T, NAME>
        const abstractIdentity: EditableIdentity<T, NAME> = {
            id,
            name,
            modelUri: this.modelUriFactory(id),

            isNewNameFit(newName: NAME): boolean {
                return index.isNewNameFitForIdentity(identity, newName)
            },

            fitNewName(newName: NAME): RollbackableResult<NAME> | undefined {
                return index.fitNameForIdentity(identity, newName)
            },

            updateName(newName: NAME): StateRollback | undefined {
                return index.renameIdentity(identity, newName)
            },

            delete(deletedSemanticModel?: sem.Identified<T, NAME>): boolean | undefined {
                if (index._allById.has(identity.id)) {
                    if (identity.isSoftDeleted) {
                        index.hardDeleteIdentity(identity)
                        return true
                    }
                    index.softDeleteIdentity(identity, deletedSemanticModel)
                    return false

                }
                return undefined
            },

            restore(): boolean {
                if (index._allById.has(identity.id)) {
                    identity.isSoftDeleted = false
                    identity.deletedSemanticModel = undefined
                    return true
                }
                return false
            },

            get isSoftDeleted(): boolean {
                return index._allSoftDeletedById.has(identity.id)
            },

            set isSoftDeleted(softDeleted: boolean) {
                if (softDeleted) {
                    index._allSoftDeletedById.set(identity.id, identity)
                } else {
                    index._allSoftDeletedById.delete(identity.id)
                }
            },

            deletedSemanticModel: undefined,
        }

        identity = this.castToSpecificIdentity(abstractIdentity)

        this.indexIdentity(identity)
        return identity
    }

    protected castToSpecificIdentity(untypedIdentity: EditableIdentity<T, NAME>): ID & EditableIdentity<T, NAME> {
        return untypedIdentity as ID
    }

    protected hasActiveNode(name: NAME): boolean {
        const identity = this._activeByName.get(name)
        return identity !== undefined && !identity.isSoftDeleted
    }

    protected indexIdentity(identity: ID) {
        this._allById.set(identity.id, identity)
        this._activeByName.set(identity.name, identity)
    }

    protected isNewNameFitForIdentity(identity: ID & EditableIdentity<T, NAME>, newName: NAME): boolean {
        return this.namesAreEqual(identity.name, newName) || this.isNameFit(newName)
    }

    protected fitNameForIdentity(identity: ID & EditableIdentity<T, NAME>, newName: NAME): RollbackableResult<NAME> | undefined {
        if (this.isNewNameFitForIdentity(identity, newName)) {
            return {
                result: newName,
                rollback: AbstractIndexedIdentities.NO_OP
            }
        }
        return this.fitUnfittedName(newName)
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected fitUnfittedName(name: NAME): RollbackableResult<NAME> | undefined {
        /**
         * By default @{link AbstractIndexedIdentities} does not know, how to fit name, if it is unfitted already
         *
         * */
        return undefined
    }

    protected renameIdentity(identity: ID & EditableIdentity<T, NAME>, newName: NAME): StateRollback | undefined {
        const oldName = identity.name
        if (!this._allById.has(identity.id)) {
            identity.name = newName
            return () => {
                identity.name = oldName
            }
        }

        if (this.namesAreEqual(oldName, newName) // Renaming doesn't have any sense
            || this.hasActiveNode(newName) // Can't rename if there is an active non-soft-deleted identity with the name
            || this._shadowedSoftDeletedByName.get(oldName) === identity) { // Can't rename shadowed identities: they are soft-deleted by design
            return undefined
        }
        // Active identities (non-deleted and deleted non-shadowed) include this identity
        return this.doRenameIdentity(identity, newName)
    }

    protected doRenameIdentity(identity: ID & EditableIdentity<T, NAME>, newName: NAME): StateRollback | undefined {
        const oldName = identity.name
        this._activeByName.delete(oldName)
        const existingIdentityByNewName = this._activeByName.get(newName)
        if (existingIdentityByNewName) { // Active identities already have another identity with name=`newName`. This another identity is soft-deleted (otherwise we would exit with `undefined` when checking `this.hasNonDeletedNode` earlier)
            this._shadowedSoftDeletedByName.set(newName, existingIdentityByNewName)
        }
        this._activeByName.set(newName, identity)

        identity.name = newName

        return () => {
            identity.name = oldName
            this._activeByName.delete(newName)
            if (existingIdentityByNewName) {
                this._shadowedSoftDeletedByName.delete(newName)
                this._activeByName.set(newName, existingIdentityByNewName)
            }
            this._activeByName.set(oldName, identity)
        }
    }

    protected softDeleteIdentity(identity: ID & EditableIdentity<T, NAME>, deletedSemanticModel?: sem.Identified<T, NAME>) {
        if (!deletedSemanticModel) {
            /* NOTE: A VERY edge case: There is no previous Semantic Model for currently missing in AST element (though identity is present).
                It is only possible, if identity model went out of sync with source language file, i.e.,
                some identities were retained in JSON file, but corresponding source models had been deleted from the language file
            */
            console.warn(`Model '${identity.id}' is to be marked for deletion, but it doesn't have a corresponding previous semantic model`)
        }
        identity.isSoftDeleted = true
        identity.deletedSemanticModel = deletedSemanticModel
    }

    protected hardDeleteIdentity(identity: ID & EditableIdentity<T, NAME>) {
        this._allById.delete(identity.id)
        this._activeByName.get(identity.name) === identity
            ? this._activeByName.delete(identity.name)
            : this._shadowedSoftDeletedByName.delete(identity.name)
        identity.isSoftDeleted = false
        identity.deletedSemanticModel = undefined
    }
}
