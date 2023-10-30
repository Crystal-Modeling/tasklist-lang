import type { AstNode } from 'langium'
import type { TypeGuard } from '../utils/types'
import { isDefinedObject } from '../utils/types'
import type { AstNodeIdentityName, DerivativeIdentityName, IdentityName, Identity } from './model'
import type { WithSemanticID } from './semantic-id'

export interface IdentityData<NAME extends IdentityName> extends Readonly<WithSemanticID> {
    name: NAME
}

export namespace IdentityData {
    export function is<NAME extends AstNodeIdentityName>(obj: unknown): obj is IdentityData<NAME>
    export function is<NAME extends DerivativeIdentityName>(obj: unknown, nameGuard: TypeGuard<NAME>): obj is IdentityData<NAME>
    export function is<NAME extends IdentityName>(obj: unknown, nameGuard: TypeGuard<NAME> = (o): o is NAME => typeof o === 'string'): obj is IdentityData<NAME> {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && nameGuard(obj.name)
    }

    export function fromIdentity<T extends AstNode, NAME extends IdentityName>({ id, name }: Identity<T, NAME>): IdentityData<NAME> {
        return { id, name }
    }

}

export type AstNodeIdentityData = IdentityData<AstNodeIdentityName>
export type DerivativeIdentityData<NAME extends DerivativeIdentityName> = IdentityData<NAME>
