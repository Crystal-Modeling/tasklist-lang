import type * as id from '../../../identity/model'
import type { ExcludeExisting } from '../../../utils/types'
import { Update } from './update'

export type ElementState = 'DISAPPEARED' | 'REAPPEARED'
export type ElementUpdate<T extends id.SemanticIdentifier> = Update<T, ElementState>
export namespace ElementUpdate {

    export function createStateUpdate<T extends id.SemanticIdentifier>(id: string, elementState: ElementState): ElementUpdate<T> {
        const update = ElementUpdate.createEmpty(id)
        update.__state = elementState
        return update
    }

    export function createEmpty<T extends id.SemanticIdentifier>(id: string): ElementUpdate<T> {
        return Update.createEmpty<T, ElementState>(id)
    }
}

export type ElementAttributes<T extends id.SemanticIdentifier> = ExcludeExisting<keyof ElementUpdate<T>, keyof id.SemanticIdentifier | keyof id.ModelUri | '__state'>
