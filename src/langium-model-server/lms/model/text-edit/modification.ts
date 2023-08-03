
import type * as id from '../../../semantic/identity'

// export interface CreationParams {
//     anchorModelId?: string
// }

export type Modification<T extends id.SemanticIdentity = id.SemanticIdentity> = Partial<T> & id.SemanticIdentity
