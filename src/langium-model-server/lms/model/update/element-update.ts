import type * as id from '../../../identity/model'
import type { WithSemanticID } from '../../../identity/semantic-id'
import type { ExcludeExisting } from '../../../utils/types'
import { Update } from './update'

export type ElementState = 'DISAPPEARED' | 'REAPPEARED'
export type ElementUpdate<T extends WithSemanticID> = Update<T, ElementState>
export namespace ElementUpdate {

    export function createStateUpdate<T extends WithSemanticID>(id: string, elementState: ElementState): ElementUpdate<T> {
        const update = ElementUpdate.createEmpty(id)
        update.__state = elementState
        return update
    }

    export function createEmpty<T extends WithSemanticID>(id: string): ElementUpdate<T> {
        return Update.createEmpty<T, ElementState>(id)
    }
}

export type ElementAttributes<T extends WithSemanticID> = ExcludeExisting<keyof ElementUpdate<T>, keyof WithSemanticID | keyof id.WithModelUri | '__state'>
