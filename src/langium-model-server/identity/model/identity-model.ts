import type { TypeGuard} from '../../utils/types'
import { isDefinedObject } from '../../utils/types'
import type { AstNodeIdentityName, DerivativeIdentityName, IdentityName } from './name'
import type { WithSemanticID } from './semantic-id'

export interface IdentityModel<NAME extends IdentityName> extends Readonly<WithSemanticID> {
    name: NAME
}

export namespace IdentityModel {
    export function is<NAME extends AstNodeIdentityName>(obj: unknown): obj is IdentityModel<NAME>
    export function is<NAME extends DerivativeIdentityName>(obj: unknown, nameGuard: TypeGuard<NAME>): obj is IdentityModel<NAME>
    export function is<NAME extends IdentityName>(obj: unknown, nameGuard: TypeGuard<NAME> = (o): o is NAME => typeof o === 'string'): obj is IdentityModel<NAME> {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && nameGuard(obj.name)
    }
}

export type AstNodeIdentityModel = IdentityModel<AstNodeIdentityName>
export type DerivativeIdentityModel<NAME extends DerivativeIdentityName> = IdentityModel<NAME>
