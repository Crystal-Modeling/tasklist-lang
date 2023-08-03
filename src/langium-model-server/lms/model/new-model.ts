
import type * as id from '../../semantic/identity'
import type { OmitProperties } from '../../utils/types'

export type NewModel<T extends id.SemanticIdentity = id.SemanticIdentity> = OmitProperties<T, id.SemanticIdentity>

export namespace NewModel {
    export function assignId<T extends id.SemanticIdentity>(newModel: NewModel<T>, semanticId: T['id']): T {
        return Object.assign(newModel, { id: semanticId }) as T
    }
}
