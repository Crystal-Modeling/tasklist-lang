import type { AstNode } from 'langium'
import * as uuid from 'uuid'
import type * as sem from '../semantic/model'
import type { TypeGuard} from '../utils/types'
import { isDefinedObject } from '../utils/types'

export type SemanticIdentifier = {
    id: string
}

export namespace SemanticIdentifier {
    export function generate(): string {
        return uuid.v4()
    }
}

export type ModelUri = {
    readonly modelUri: string
}

export namespace ModelUri {

    export const root = '/'
    const PROPERTY = '/'
    const ID = '#'

    export function ofSegments(...segments: Segment[]): string {
        return segments.map(s => s.delimiter + s.value).join('')
    }

    export namespace Segment {

        export function property(propertyName: string): Segment {
            return of(PROPERTY, propertyName)
        }

        export function id(idValue: string): Segment {
            return of(ID, idValue)
        }

        function of(delimiter: string, value: string): Segment {
            return { delimiter, value } as Segment
        }
    }

    export type Segment = {
        __brand: 'segment'
        readonly delimiter: string
        readonly value: string
    }
}

export type DerivativeIdentityName = object
export type AstNodeIdentityName = string
export type IdentityName = AstNodeIdentityName | DerivativeIdentityName

export type StateRollback = () => void
export namespace StateRollback {
    export function add(r1: StateRollback | undefined, r2: StateRollback): StateRollback {
        if (!r1) return r2
        return () => {
            r2()
            r1()
        }
    }
}
export type RollbackableResult<T> = {
    result: T,
    rollback: StateRollback
}

export interface IdentityModel<NAME extends IdentityName> extends Readonly<SemanticIdentifier> {
    name: NAME
}

export namespace IdentityModel {
    export function is<NAME extends AstNodeIdentityName>(obj: unknown): obj is IdentityModel<NAME>
    export function is<NAME extends DerivativeIdentityName>(obj: unknown, nameGuard: TypeGuard<NAME>): obj is IdentityModel<NAME>
    export function is<NAME extends IdentityName>(obj: unknown, nameGuard: TypeGuard<NAME> = (o): o is NAME => typeof o.id === 'string'): obj is IdentityModel<NAME> {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && nameGuard(obj.name)
    }
}

export type AstNodeIdentityModel = IdentityModel<AstNodeIdentityName>
export type DerivativeIdentityModel<NAME extends DerivativeIdentityName> = IdentityModel<NAME>

export interface EditableIdentity<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName = IdentityName> extends IdentityModel<NAME>, Readonly<ModelUri> {
    isNewNameFit(newName: NAME): boolean
    fitNewName(newName: NAME): RollbackableResult<NAME> | undefined
    /**
     * Replaces the `name` value with supplied argument. Returns {@link StateRollback} if the name has changed, which can be used to rollback the operation.
     * If the renaming cannot be performed (e.g., there is already an indexed Identity with name = `newName`), returns `undefined`
     * @param newName New name to replace the `name` property of this identity.
     * @returns {@link StateRollback} if identity was successfully renamed, or `undefined` otherwise.
     */
    updateName(newName: NAME): StateRollback | undefined
    /**
     * Binds this identity to a semantic model (previously available) and marks this identity as soft-deleted in IndexedIdentities it belongs to.
     * If this identity is already soft-deleted, removes the identity from the IndexedIdentities it belongs to (performs hard delete)
     * Subsequent attempts to modify `this` identity will always return `undefined`.
     * @returns `true` if identity was hard-deleted during the invokation, `false` -- if the identity was soft-deleted, or `undefined` otherwise.
     */
    delete(deletedSemanticModel?: sem.Identified<T, NAME>): boolean | undefined
    /**
     * Restores soft-deleted identity (if it has not been hard-deleted from the IndexedIdentity it belongs to).
     * @returns `true` if identity was successfully restored or `false` if it has already been hard-deleted.
     */
    restore(): boolean

    isSoftDeleted: boolean
    deletedSemanticModel?: sem.Identified<T, NAME>
}

export type Identity<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName = IdentityName> = Readonly<EditableIdentity<T, NAME>>

export namespace Identity {
    export function toModel<T extends AstNode | sem.ArtificialAstNode, NAME extends IdentityName>({ id, name }: Identity<T, NAME>): IdentityModel<NAME> {
        return { id, name }
    }
}

export type AstNodeIdentity<T extends AstNode> = Identity<T, AstNodeIdentityName>
export type DerivativeIdentity<T extends sem.ArtificialAstNode, NAME extends DerivativeIdentityName = DerivativeIdentityName> = Identity<T, NAME>
