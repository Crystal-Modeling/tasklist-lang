import type { RootUpdate } from '../lms/model'
import type { AbstractMap } from '../utils/collections'
import { ValueBasedMap, equal } from '../utils/collections'
import type { Identity, DerivativeIdentityName, IdentityName, AstNodeIdentityName, StateRollback } from './model'
import { SemanticIdentifier } from './model'

export type IdentityIndex<SM extends SemanticIdentifier> = {
    readonly id: string
    removeDeletedIdentities(modelUpdate: RootUpdate<SM>): void
}

export type ModelExposedIdentityIndex<SM extends SemanticIdentifier, SemI extends IdentityIndex<SM>> = SemI & {
    readonly model: object
}

export interface IndexedIdentities<NAME extends IdentityName, ID extends Identity<NAME>> {
    getCopyByName(): AbstractMap<NAME, Readonly<ID>>
    values(): Iterable<Readonly<ID>>
    byName(name: NAME): Readonly<ID> | undefined
    addNew(name: NAME): ID
    add(id: string, name: NAME): ID
    delete(ids: Iterable<string>): void
}

export abstract class AbstractIndexedIdentities<NAME extends IdentityName, ID extends Identity<NAME>> implements IndexedIdentities<NAME, ID> {
    protected readonly _byId: Map<string, ID> = new Map()
    protected readonly _softDeletedIds: Set<string> = new Set()
    protected abstract readonly _byName: AbstractMap<NAME, ID>
    protected readonly modelUriFactory: (id: string) => string

    public constructor(modelUriFactory: (id: string) => string) {
        this.modelUriFactory = modelUriFactory
    }

    public values(): Iterable<Readonly<ID>> {
        return this._byId.values()
    }

    public byName(name: NAME): Readonly<ID> | undefined {
        return this._byName.get(name)
    }

    public addNew(name: NAME): ID {
        return this.add(SemanticIdentifier.generate(), name)
    }

    public add(id: string, name: NAME): ID {
        const index = this
        let identity: ID & { name: NAME }
        const abstractIdentity: Identity<NAME> & { name: NAME } = {
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

            softDelete(): boolean {
                if (!index._softDeletedIds.has(identity.id)) {
                    index._softDeletedIds.add(identity.id)
                    return true
                }
                return false
            },
        }

        identity = this.castToSpecificIdentity(abstractIdentity)

        this._byId.set(identity.id, identity)
        this._byName.set(identity.name, identity)
        return identity
    }

    public delete(ids: Iterable<string>) {
        for (const id of ids) {
            this.deleteById(id)
        }
    }

    protected castToSpecificIdentity(untypedIdentity: Identity<NAME> & { name: NAME }): ID & { name: NAME } {
        return untypedIdentity as ID
    }

    protected deleteById(id: string) {
        const identity = this._byId.get(id)
        if (identity) {
            this._byId.delete(identity.id)
            this._byName.delete(identity.name)
        }
    }

    public abstract getCopyByName(): AbstractMap<NAME, Readonly<ID>>
    protected abstract namesAreEqual(left: NAME, right: NAME): boolean
}

export class AstNodeIndexedIdentities<NAME extends AstNodeIdentityName, ID extends Identity<NAME>> extends AbstractIndexedIdentities<NAME, ID> {

    protected override readonly _byName: Map<NAME, ID> = new Map()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return new Map(this._byName)
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return left === right
    }
}

export class DerivativeIndexedIdentities<NAME extends DerivativeIdentityName, ID extends Identity<NAME>> extends AbstractIndexedIdentities<NAME, ID> {

    protected override readonly _byName: ValueBasedMap<NAME, ID> = new ValueBasedMap()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return this._byName.copy()
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return equal(left, right)
    }
}
