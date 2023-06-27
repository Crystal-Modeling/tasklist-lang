import type * as id from '../../semantic/identity'
import { Update } from './update'

export type ElementState = 'DISAPPEARED' | 'REAPPEARED'
export type ElementUpdate<T extends id.SemanticIdentity> = Update<T, ElementState>
export namespace ElementUpdate {

    export function createStateUpdate<T extends id.SemanticIdentity>(id: string, elementState: ElementState): ElementUpdate<T> {
        const update = Update.createEmpty<T, ElementState>(id)
        update.__state = elementState
        return update
    }
}
