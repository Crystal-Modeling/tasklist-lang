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

    export function isEmpty<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>): boolean {
        return !arrayUpdate.added && !arrayUpdate.removedIds && !arrayUpdate.changed
    }

    export function addUpdate<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, elementUpdate: ElementUpdate<T>): void {
        if (elementUpdate.__kind === ElementAddition) {
            pushNew(arrayUpdate, elementUpdate.element)
        } else {
            pushUpdate(arrayUpdate, elementUpdate.update)
        }
    }

    export function addRemovals<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, removedIds: string[]): void {
        arrayUpdate.removedIds = (arrayUpdate.removedIds ?? []).concat(removedIds)
    }

    export function addRemoval<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, removedId: string): void {
        if (!arrayUpdate.removedIds) {
            arrayUpdate.removedIds = []
        }
        arrayUpdate.removedIds.push(removedId)
    }

    function pushNew<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, element: T): void {
        if (!arrayUpdate.added) {
            arrayUpdate.added = []
        }
        arrayUpdate.added.push(element)
    }

    function pushUpdate<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, update: Update<T>): void {
        if (!arrayUpdate.changed) {
            arrayUpdate.changed = []
        }
        arrayUpdate.changed.push(update)
    }
}

export type ElementUpdate<T extends id.SemanticIdentity> = ElementAddition<T> | ElementModification<T>
export namespace ElementUpdate {

    export function newAddition<T extends id.SemanticIdentity>(element: T): ElementUpdate<T> {
        return { element, __kind: ElementAddition }
    }

    export function newModification<T extends id.SemanticIdentity>(update: Update<T>): ElementUpdate<T> {
        return { update, __kind: ElementModification }
    }
}

type ElementAddition<T extends id.SemanticIdentity> = {
    __kind: 'ADD'
    element: T
}
const ElementAddition = 'ADD'

type ElementModification<T extends id.SemanticIdentity> = {
    __kind: 'MODIFY'
    update: Update<T>
}
const ElementModification = 'MODIFY'
