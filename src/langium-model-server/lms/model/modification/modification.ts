
import type * as id from '../../../identity/model'
import type { OmitProperties} from '../../../utils/types'
import { isDefinedObject } from '../../../utils/types'

export type Modification<T extends id.SemanticIdentifier = id.SemanticIdentifier> = Partial<OmitProperties<T, id.SemanticIdentifier>>

export namespace Modification {
    export function is<T extends id.SemanticIdentifier = id.SemanticIdentifier>(obj: unknown): obj is Modification<T> {
        return isDefinedObject(obj)
    }
}
