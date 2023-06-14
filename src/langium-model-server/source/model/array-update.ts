import type * as id from '../../semantic/identity'
import type { Update } from './update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type ArrayUpdate<T extends id.SemanticIdentity> = {
    added?: T[],
    removedIds?: string[],
    changed?: Array<Update<T>>
}

export namespace ArrayUpdate {

    export function hasChanges<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>): boolean {
        return !!arrayUpdate.added || !!arrayUpdate.removedIds || !!arrayUpdate.changed
    }

    export function pushChange<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, change: Update<T>): void {
        if (!arrayUpdate.changed) {
            arrayUpdate.changed = []
        }
        arrayUpdate.changed.push(change)
    }

    export function pushRemoval<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, removedId: string): void {
        if (!arrayUpdate.removedIds) {
            arrayUpdate.removedIds = []
        }
        arrayUpdate.removedIds.push(removedId)
    }

    export function pushNewElement<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, newElement: T): void {
        if (!arrayUpdate.added) {
            arrayUpdate.added = []
        }
        arrayUpdate.added.push(newElement)
    }
}
