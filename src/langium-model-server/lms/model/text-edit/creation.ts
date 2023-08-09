
import type * as id from '../../../semantic/identity'
import type { OmitProperties } from '../../../utils/types'

export interface CreationParams {
    anchorModelId?: string
}

export type Creation<T extends id.SemanticIdentity = id.SemanticIdentity> = OmitProperties<T, id.SemanticIdentity>

