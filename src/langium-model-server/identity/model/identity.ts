import type { AstNode } from 'langium'
import type * as sem from '../../semantic/model'
import type { IdentityModel } from './identity-model'
import type { AstNodeIdentityName, DerivativeIdentityName, IdentityName } from './name'
import type { WithModelUri } from './uri'

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

export interface EditableIdentity<T extends AstNode, NAME extends IdentityName = IdentityName> extends IdentityModel<NAME>, Readonly<WithModelUri> {
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
     * Performs hard-deletion of this identity
     * @returns `id` of hard-deleted identity
     */
    remove(): string
    /**
     * Restores soft-deleted identity (if it has not been hard-deleted from the IndexedIdentity it belongs to).
     * @returns `true` if identity was successfully restored or `false` if it has already been hard-deleted.
     */
    restore(): boolean

    isSoftDeleted: boolean
    deletedSemanticModel?: sem.Identified<T, NAME>
}

export type Identity<T extends AstNode = AstNode, NAME extends IdentityName = IdentityName> = Readonly<EditableIdentity<T, NAME>>

export namespace Identity {
    export function toModel<T extends AstNode, NAME extends IdentityName>({ id, name }: Identity<T, NAME>): IdentityModel<NAME> {
        return { id, name }
    }
}

export type AstNodeIdentity<T extends AstNode> = Identity<T, AstNodeIdentityName>
export type DerivativeIdentity<T extends AstNode, NAME extends DerivativeIdentityName = DerivativeIdentityName> = Identity<T, NAME>
