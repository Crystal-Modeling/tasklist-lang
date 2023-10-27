
import type { WithSemanticID } from '../../../identity/semantic-id'
import type { OmitProperties } from '../../../utils/types'

export interface CreationParams {
    anchorModelId?: string
}

export type Creation<T extends WithSemanticID = WithSemanticID> = OmitProperties<T, WithSemanticID>

