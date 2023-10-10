import type { RootUpdate } from '../lms/model'
import type { AbstractMap } from '../utils/collections'
import { ValueBasedMap, equal } from '../utils/collections'
import type { Indexed, NamedSemanticIdentity, SemanticDerivativeName, SemanticName, SemanticPropertyName } from './model'
import { SemanticIdentity } from './model'

export type IdentityIndex<SM extends SemanticIdentity> = {
    readonly id: string
    removeDeletedIdentities(modelUpdate: RootUpdate<SM>): void
}

export type ModelExposedIdentityIndex<SM extends SemanticIdentity, SemI extends IdentityIndex<SM>> = SemI & {
    readonly model: object
}

export interface IndexedIdentities<NAME extends SemanticName, ID extends Indexed<NamedSemanticIdentity<NAME>>> {
    getCopyByName(): AbstractMap<NAME, Readonly<ID>>
    values(): Iterable<Readonly<ID>>
    byName(name: NAME): Readonly<ID> | undefined
    addNew(name: NAME): ID
    add(id: string, name: NAME): ID
    delete(ids: Iterable<string>): void
}

export abstract class AbstractIndexedIdentities<NAME extends SemanticName, ID extends Indexed<NamedSemanticIdentity<NAME>>> implements IndexedIdentities<NAME, ID> {
    protected readonly _byId: Map<string, ID> = new Map()
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
        return this.add(SemanticIdentity.generate(), name)
    }

    public add(id: string, name: NAME): ID {
        const index = this
        let identity: ID & { name: NAME }
        const abstractIdentity: Indexed<NamedSemanticIdentity<NAME>> & { name: NAME } = {
            id,
            name,
            modelUri: this.modelUriFactory(id),

            updateName(newName: NAME): boolean {
                if (!index.namesAreEqual(identity.name, newName)) {
                    if (index._byName.delete(identity.name))
                        index._byName.set(newName, identity)
                    identity.name = newName
                    return true
                }
                return false
            },

            delete(): boolean {
                index._byName.delete(identity.name)
                return index._byId.delete(identity.id)
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

    protected castToSpecificIdentity(untypedIdentity: Indexed<NamedSemanticIdentity<NAME>> & { name: NAME }): ID & { name: NAME } {
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

export class AstNodeIndexedIdentities<NAME extends SemanticPropertyName, ID extends Indexed<NamedSemanticIdentity<NAME>>> extends AbstractIndexedIdentities<NAME, ID> {

    protected override readonly _byName: Map<NAME, ID> = new Map()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return new Map(this._byName)
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return left === right
    }
}

export class DerivativeIndexedIdentities<NAME extends SemanticDerivativeName, ID extends Indexed<NamedSemanticIdentity<NAME>>> extends AbstractIndexedIdentities<NAME, ID> {

    protected override readonly _byName: ValueBasedMap<NAME, ID> = new ValueBasedMap()

    public override getCopyByName(): AbstractMap<NAME, Readonly<ID>> {
        return this._byName.copy()
    }

    protected override namesAreEqual(left: NAME, right: NAME): boolean {
        return equal(left, right)
    }
}
