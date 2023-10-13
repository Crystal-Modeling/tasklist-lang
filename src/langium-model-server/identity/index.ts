import type { AstNode } from 'langium'
import { MultiMap } from 'langium'
import type * as sem from '../semantic/model'
import type { AbstractMap } from '../utils/collections'
import { ValueBasedMap, equal } from '../utils/collections'
import type { AstNodeIdentityName, DerivativeIdentityName, EditableIdentity, Identity, IdentityName, RollbackableResult, StateRollback } from './model'
import { SemanticIdentifier } from './model'

export type IdentityIndex = {
    readonly id: string
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}

export interface IndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> {
    getCopyByName(): AbstractMap<NAME, ID>
    getSoftDeleted(): Iterable<ID>
    values(): Iterable<ID>
    byName(name: NAME): ID | undefined
    fitNew(name: NAME): RollbackableResult<NAME> | undefined
    addNew(name: NAME): ID
    add(id: string, name: NAME): ID
}

export abstract class AbstractIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> implements IndexedIdentities<T, NAME, ID> {

    protected static readonly NO_OP = () => { }

    protected readonly _byId: Map<string, ID> = new Map()
    protected readonly _softDeleted: Map<string, ID> = new Map()
    protected abstract readonly _byName: AbstractMap<NAME, ID>
    protected readonly modelUriFactory: (id: string) => string

    public constructor(modelUriFactory: (id: string) => string) {
        this.modelUriFactory = modelUriFactory
    }

    getSoftDeleted(): Iterable<ID> {
        return this._softDeleted.values()
    }

    public values(): Iterable<ID> {
        return this._byId.values()
    }

    public byName(name: NAME): ID | undefined {
        return this._byName.get(name)
    }

    public fitNew(name: NAME): RollbackableResult<NAME> | undefined {
        const existing = this._byName.get(name)
        if (!existing || existing.isSoftDeleted) {
            return {
                result: name,
                rollback: AbstractIndexedIdentities.NO_OP
            }
        }
        return undefined
    }

    protected fitNewName(identity: ID & EditableIdentity<T, NAME>, newName: NAME): RollbackableResult<NAME> | undefined {
        if (this.namesAreEqual(identity.name, newName)) {
            return {
                result: identity.name,
                rollback: AbstractIndexedIdentities.NO_OP
            }
        }
        return this.fitNew(newName)
    }

    /**
     * Not to be used by LMS API, since it relies on name validation performed by the textual language itself
     * @returns Newly created identity
     */
    public addNew(name: NAME): ID {
        return this.add(SemanticIdentifier.generate(), name)
    }

    public add(id: string, name: NAME): ID {
        const index = this
        let identity: ID & EditableIdentity<T, NAME>
        const abstractIdentity: EditableIdentity<T, NAME> = {
            id,
            name,
            modelUri: this.modelUriFactory(id),

            fitNewName(newName: NAME): RollbackableResult<NAME> | undefined {
                return index.fitNewName(identity, newName)
            },

            updateName(newName: NAME): StateRollback | undefined {
                return index.rename(identity, newName)
            },

            delete(deletedSemanticModel?: sem.Identified<T, NAME>): boolean | undefined {
                if (index._byId.has(identity.id)) {
                    if (identity.isSoftDeleted) {
                        index.hardDelete(identity)
                        return true
                    }
                    index.softDelete(identity, deletedSemanticModel)
                    return false

                }
                return undefined
            },

            restore(): boolean {
                if (index._byId.has(identity.id)) {
                    identity.isSoftDeleted = false
                    identity.deletedSemanticModel = undefined
                    return true
                }
                return false
            },

            get isSoftDeleted(): boolean {
                return index._softDeleted.has(identity.id)
            },

            set isSoftDeleted(softDeleted: boolean) {
                if (softDeleted) {
                    index._softDeleted.set(identity.id, identity)
                } else {
                    index._softDeleted.delete(identity.id)
                }
            },

            deletedSemanticModel: undefined,
        }

        identity = this.castToSpecificIdentity(abstractIdentity)

        this.addIdentity(identity)
        return identity
    }

    protected castToSpecificIdentity(untypedIdentity: EditableIdentity<T, NAME>): ID & EditableIdentity<T, NAME> {
        return untypedIdentity as ID
    }

    protected addIdentity(identity: ID) {
        this._byId.set(identity.id, identity)
        this._byName.set(identity.name, identity)
    }

    protected rename(identity: ID & EditableIdentity<T, NAME>, newName: NAME): StateRollback | undefined {
        const oldName = identity.name
        if (!this.namesAreEqual(oldName, newName) && !this._byName.has(newName)) {
            const wasIndexed = this._byName.delete(oldName)
            if (wasIndexed) {
                this._byName.set(newName, identity)
            }
            identity.name = newName
            return () => {
                identity.name = oldName
                if (wasIndexed) {
                    this._byName.delete(newName)
                    this._byName.set(oldName, identity)
                }
            }
        }
        return undefined
    }

    protected softDelete(identity: ID & EditableIdentity<T, NAME>, deletedSemanticModel?: sem.Identified<T, NAME>) {
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

    protected hardDelete(identity: ID & EditableIdentity<T, NAME>) {
        this._byId.delete(identity.id)
        this._byName.delete(identity.name)
        identity.isSoftDeleted = false
        identity.deletedSemanticModel = undefined
    }

    public abstract getCopyByName(): AbstractMap<NAME, Readonly<ID>>
    protected abstract namesAreEqual(left: NAME, right: NAME): boolean
}

export class AstNodeIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, ID extends Identity<T, AstNodeIdentityName>> extends AbstractIndexedIdentities<T, AstNodeIdentityName, ID> {

    private static readonly DUPLICATES_DELIM = '_'

    protected override readonly _byName: Map<AstNodeIdentityName, ID> = new Map()
    protected readonly _nameDuplicates: MultiMap<AstNodeIdentityName, AstNodeIdentityName> = new MultiMap()

    public override getCopyByName(): AbstractMap<AstNodeIdentityName, Readonly<ID>> {
        return new Map(this._byName)
    }

    protected override fitNewName(identity: ID & EditableIdentity<T, AstNodeIdentityName>, newName: AstNodeIdentityName): RollbackableResult<AstNodeIdentityName> | undefined {
        const oldNameIsLastDuplicateForNewName = this._nameDuplicates.get(newName).at(-1) === identity.name
        if (this.namesAreEqual(identity.name, newName) || oldNameIsLastDuplicateForNewName) {
            return {
                result: identity.name,
                rollback: AbstractIndexedIdentities.NO_OP
            }
        }
        return this.fitNew(newName)
    }

    protected override rename(identity: ID & EditableIdentity<T, AstNodeIdentityName>, newName: AstNodeIdentityName): StateRollback | undefined {
        const oldName = identity.name
        if (!this.namesAreEqual(oldName, newName) && !this._byName.has(newName)) {
            const wasIndexed = this._byName.delete(oldName)
            let originalName: string | undefined
            if (wasIndexed) {
                originalName = this.removeNameDuplicate(identity.name)
                this._byName.set(newName, identity)
            }
            identity.name = newName
            return () => {
                identity.name = oldName
                if (wasIndexed) {
                    this._byName.delete(newName)
                    if (originalName) {
                        this._nameDuplicates.add(originalName, oldName)
                    }
                    this._byName.set(oldName, identity)
                }
            }
        }
        return undefined
    }

    public override fitNew(name: AstNodeIdentityName): RollbackableResult<AstNodeIdentityName> {
        return super.fitNew(name) || this.makeNameUnique(name)
    }

    protected override hardDelete(identity: ID & EditableIdentity<T, string>): void {
        super.hardDelete(identity)
        this.removeNameDuplicate(identity.name)
    }

    /**
     * @param name identity name which should be removed from the duplicates list
     * @returns `originalName` if it existed and [`originalName`, `name`] was removed from the duplicates multimap. Otherwise returns `undefined`
     */
    private removeNameDuplicate(name: AstNodeIdentityName): string | undefined {
        const originalName = name.substring(0, name.lastIndexOf(AstNodeIndexedIdentities.DUPLICATES_DELIM))
        if (this._nameDuplicates.delete(originalName, name)) {
            return originalName
        }
        return undefined
    }

    protected override namesAreEqual(left: AstNodeIdentityName, right: AstNodeIdentityName): boolean {
        return left === right
    }

    private makeNameUnique(name: AstNodeIdentityName): RollbackableResult<AstNodeIdentityName> {
        const lastDuplicate = this._nameDuplicates.get(name).at(-1)
        let maxNumber: number
        if (lastDuplicate) {
            maxNumber = Number.parseInt(lastDuplicate.substring(lastDuplicate.lastIndexOf(AstNodeIndexedIdentities.DUPLICATES_DELIM))) || 1
        } else {
            maxNumber = 1
        }
        let newName: string
        let existing: ID | undefined
        do {
            newName = name + '_' + ++maxNumber
            this._nameDuplicates.add(name, newName)
            existing = this._byName.get(newName)
        } while (existing && !existing.isSoftDeleted)

        return {
            result: newName,
            rollback: () => this._nameDuplicates.delete(name, newName)
        }

    }
}

export class DerivativeIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends DerivativeIdentityName, ID extends Identity<T, NAME>> extends AbstractIndexedIdentities<T, NAME, ID> {

    protected override readonly _byName: ValueBasedMap<NAME, ID> = new ValueBasedMap()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return this._byName.copy()
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return equal(left, right)
    }
}
