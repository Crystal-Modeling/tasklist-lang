import type * as id from '../../../semantic/identity'
import type { ExcludeExisting } from '../../../utils/types'
import { Update } from './update'

export type ElementState = 'DISAPPEARED' | 'REAPPEARED'
export type ElementUpdate<T extends id.SemanticIdentity> = Update<T, ElementState>
export namespace ElementUpdate {

    export function createStateUpdate<T extends id.SemanticIdentity>(id: string, elementState: ElementState): ElementUpdate<T> {
        const update = ElementUpdate.createEmpty(id)
        update.__state = elementState
        return update
    }

    export function createEmpty<T extends id.SemanticIdentity>(id: string): ElementUpdate<T> {
        return Update.createEmpty<T, ElementState>(id)
    }
}

export type ElementAttributes<T extends id.SemanticIdentity> = ExcludeExisting<keyof ElementUpdate<T>, 'id' | '__state'>
