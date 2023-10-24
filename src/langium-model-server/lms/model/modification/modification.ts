
import type * as id from '../../../identity/model'
import type { OmitProperties} from '../../../utils/types'
import { isDefinedObject } from '../../../utils/types'

export type Modification<T extends id.WithSemanticID = id.WithSemanticID> = Partial<OmitProperties<T, id.WithSemanticID>>

export namespace Modification {
    export function is<T extends id.WithSemanticID = id.WithSemanticID>(obj: unknown): obj is Modification<T> {
        return isDefinedObject(obj)
    }
}
