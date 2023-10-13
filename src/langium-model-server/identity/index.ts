import type { AstNode } from 'langium'
import type * as sem from '../semantic/model'
import type { AbstractMap } from '../utils/collections'
import { ValueBasedMap, equal } from '../utils/collections'
import type { AstNodeIdentityName, DerivativeIdentityName, EditableIdentity, Identity, IdentityName, StateRollback } from './model'
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
    addNew(name: NAME): ID
    add(id: string, name: NAME): ID
}

export abstract class AbstractIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName, ID extends Identity<T, NAME>> implements IndexedIdentities<T, NAME, ID> {
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

            updateName(newName: NAME): StateRollback | undefined {
                const oldName = identity.name
                if (!index.namesAreEqual(oldName, newName) && !index._byName.has(newName)) {
                    const wasIndexed = index._byName.delete(oldName)
                    if (wasIndexed) {
                        index._byName.set(newName, identity)
                    }
                    identity.name = newName
                    return () => {
                        identity.name = oldName
                        if (wasIndexed) {
                            index._byName.delete(newName)
                            index._byName.set(oldName, identity)
                        }
                    }
                }
                return undefined
            },

            delete(deletedSemanticModel?: sem.Identified<T, NAME>): boolean | undefined {
                if (index._byId.has(identity.id)) {
                    if (identity.isSoftDeleted) {
                        index._byId.delete(identity.id)
                        index._byName.delete(identity.name)
                        identity.isSoftDeleted = false
                        identity.deletedSemanticModel = undefined
                        return true
                    }
                    if (!deletedSemanticModel) {
                        /* NOTE: A VERY edge case: There is no previous Semantic Model for currently missing in AST element (though identity is present).
                            It is only possible, if identity model went out of sync with source language file, i.e.,
                            some identities were retained in JSON file, but corresponding source models had been deleted from the language file
                        */
                        console.warn(`Model '${identity.id}' is to be marked for deletion, but it doesn't have a corresponding previous semantic model`)
                    }
                    identity.isSoftDeleted = true
                    identity.deletedSemanticModel = deletedSemanticModel
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

        this._byId.set(identity.id, identity)
        this._byName.set(identity.name, identity)
        return identity
    }

    protected castToSpecificIdentity(untypedIdentity: EditableIdentity<T, NAME>): ID & EditableIdentity<T, NAME> {
        return untypedIdentity as ID
    }

    public abstract getCopyByName(): AbstractMap<NAME, Readonly<ID>>
    protected abstract namesAreEqual(left: NAME, right: NAME): boolean
}

export class AstNodeIndexedIdentities<T extends AstNode | sem.ArtificialAstNode, NAME extends AstNodeIdentityName, ID extends Identity<T, NAME>> extends AbstractIndexedIdentities<T, NAME, ID> {

    protected override readonly _byName: Map<NAME, ID> = new Map()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return new Map(this._byName)
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return left === right
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
