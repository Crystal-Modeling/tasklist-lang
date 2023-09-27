
import type * as id from '../../../identity/model'
import type { OmitProperties} from '../../../utils/types'
import { isDefinedObject } from '../../../utils/types'

export type Modification<T extends id.SemanticIdentity = id.SemanticIdentity> = Partial<OmitProperties<T, id.SemanticIdentity>>

export namespace Modification {
    export function is<T extends id.SemanticIdentity = id.SemanticIdentity>(obj: unknown): obj is Modification<T> {
        return isDefinedObject(obj)
    }
}
