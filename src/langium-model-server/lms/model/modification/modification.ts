
import type { WithSemanticID } from '../../../identity/semantic-id'
import type { OmitProperties } from '../../../utils/types'
import { isDefinedObject } from '../../../utils/types'

export type Modification<T extends WithSemanticID = WithSemanticID> = Partial<OmitProperties<T, WithSemanticID>>

export namespace Modification {
    export function is<T extends WithSemanticID = WithSemanticID>(obj: unknown): obj is Modification<T> {
        return isDefinedObject(obj)
    }
}
