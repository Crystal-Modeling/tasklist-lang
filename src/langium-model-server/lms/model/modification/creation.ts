
import type * as id from '../../../identity/model'
import type { OmitProperties } from '../../../utils/types'

export interface CreationParams {
    anchorModelId?: string
}

export type Creation<T extends id.WithSemanticID = id.WithSemanticID> = OmitProperties<T, id.WithSemanticID>

