
import type * as id from '../../../semantic/identity'
import type { OmitProperties} from '../../../utils/types'
import { isDefinedObject } from '../../../utils/types'

// export interface CreationParams {
//     anchorModelId?: string
// }

// NOTE: if `name` property is present on the LMS model, then it corresponds to AST name, and should not be updated as a normal model content
export type Modification<T extends id.SemanticIdentity = id.SemanticIdentity> = Partial<OmitProperties<T, id.SemanticIdentity>>

export namespace Modification {
    export function is<T extends id.SemanticIdentity = id.SemanticIdentity>(obj: unknown): obj is Modification<T> {
        return isDefinedObject(obj)
    }
}
