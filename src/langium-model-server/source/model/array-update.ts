import type * as id from '../../semantic/identity'
import { Update } from './update'

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
        switch(elementUpdate.__kind) {
            case ElementAddition:
                pushNew(arrayUpdate, elementUpdate.element)
                break
            case ElementModification:
                pushUpdate(arrayUpdate, elementUpdate.update)
                break
            case NoElementUpdate:
                break
        }
    }

    export function addRemovals<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, elements: Iterable<T>): void {
        arrayUpdate.removedIds = (arrayUpdate.removedIds ?? []).concat(Array.from(elements, el => el.id))
    }

    export function addRemoval<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, element: T): void {
        if (!arrayUpdate.removedIds) {
            arrayUpdate.removedIds = []
        }
        arrayUpdate.removedIds.push(element.id)
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

export type ElementUpdate<T extends id.SemanticIdentity> = ElementAddition<T> | ElementModification<T> | NoElementUpdate

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

// Null object when no actual update is detected
type NoElementUpdate = {
    __kind: 'NULL'
}
const NoElementUpdate = 'NULL'

export namespace ElementUpdate {

    const _noUpdate: NoElementUpdate = { __kind: NoElementUpdate }

    export function addition<T extends id.SemanticIdentity>(element: T): ElementUpdate<T> {
        return { element, __kind: ElementAddition }
    }

    export function potentialModification<T extends id.SemanticIdentity>(update: Update<T>): ElementUpdate<T> {
        if (Update.isEmpty(update)) {
            return noUpdate()
        }
        return { update, __kind: ElementModification }
    }

    export function noUpdate<T extends id.SemanticIdentity>(): ElementUpdate<T> {
        return _noUpdate
    }
}
