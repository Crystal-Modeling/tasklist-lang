import type { Stream } from 'langium'
import { stream } from 'langium'
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

export type ReadonlyArrayUpdate<T extends id.SemanticIdentity> = {
    readonly added?: readonly T[],
    readonly removedIds?: readonly string[]
    readonly changed?: ReadonlyArray<Update<T>>
}

export namespace ArrayUpdate {

    export function isEmpty<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>): boolean {
        return !arrayUpdate.added && !arrayUpdate.removedIds && !arrayUpdate.changed
    }

    export function apply<T extends id.SemanticIdentity>(arrayUpdate: ArrayUpdate<T>, arrayUpdateCommand: ReadonlyArrayUpdate<T>): void {
        if (arrayUpdateCommand.added) {
            arrayUpdate.added = addNew(arrayUpdate.added, arrayUpdateCommand.added)
        }
        if (arrayUpdateCommand.changed) {
            arrayUpdate.changed = addNew(arrayUpdate.changed, arrayUpdateCommand.changed)
        }
        if (arrayUpdateCommand.removedIds) {
            arrayUpdate.removedIds = addNew(arrayUpdate.removedIds, arrayUpdateCommand.removedIds)
        }
    }

    function addNew<T>(existing: T[] | undefined, newElements: readonly T[]): T[] {
        if (!existing) {
            existing = []
        }
        for (const el of newElements) {
            existing.push(el)
        }
        return existing
    }
}

class NullArrayUpdateCommand<T extends id.SemanticIdentity> implements ReadonlyArrayUpdate<T> {

    public get added(): undefined {
        return undefined
    }

    public get removedIds(): undefined {
        return undefined
    }

    public get changed(): undefined {
        return undefined
    }
}

export class ArrayUpdateCommand<T extends id.SemanticIdentity> implements ReadonlyArrayUpdate<T> {

    private static NO_UPDATE = new NullArrayUpdateCommand()

    protected _elementsToAdd?: T[]
    protected _idsToRemove?: string[]
    protected _updatesToAdd?: Array<Update<T>>

    public static addition<T extends id.SemanticIdentity>(element: T): ReadonlyArrayUpdate<T>
    public static addition<T extends id.SemanticIdentity>(elements: T[]): ReadonlyArrayUpdate<T>
    public static addition<T extends id.SemanticIdentity>(elements: T | T[]): ReadonlyArrayUpdate<T> {
        const elementsToAdd = this.toNonEmptyArray(elements)
        if (elementsToAdd) {
            return new ArrayUpdateCommand(elementsToAdd)
        }
        return this.NO_UPDATE
    }

    public static deletion<T extends id.SemanticIdentity>(elements: Iterable<id.SemanticIdentity>): ReadonlyArrayUpdate<T> {
        const idsToRemove = Array.from(elements, el => el.id)
        if (idsToRemove.length !== 0) {
            return new ArrayUpdateCommand(undefined, idsToRemove)
        }
        return this.NO_UPDATE
    }

    public static modification<T extends id.SemanticIdentity>(update: Update<T>): ReadonlyArrayUpdate<T>
    public static modification<T extends id.SemanticIdentity>(updates: Array<Update<T>>): ReadonlyArrayUpdate<T>
    public static modification<T extends id.SemanticIdentity>(updates: Update<T> | Array<Update<T>>): ReadonlyArrayUpdate<T> {
        const updatesToAdd = this.toNonEmptyArray(updates, (upd) => !Update.isEmpty(upd))
        if (updatesToAdd) {
            return new ArrayUpdateCommand(undefined, undefined, updatesToAdd)
        }
        return this.NO_UPDATE
    }

    public static noUpdate<T extends id.SemanticIdentity>(): ReadonlyArrayUpdate<T> {
        return this.NO_UPDATE
    }

    public static all<T extends id.SemanticIdentity>(updates: Iterable<ReadonlyArrayUpdate<T>>): ReadonlyArrayUpdate<T> {
        const updatesStream = stream(updates)
        const elementsToAdd = this.concatNotEmpty(updatesStream.map(upd => upd.added))
        const idsToRemove = this.concatNotEmpty(updatesStream.map(upd => upd.removedIds))
        const updatesToAdd = this.concatNotEmpty(updatesStream.map(upd => upd.changed))
        if (!!elementsToAdd || !!idsToRemove || !!updatesToAdd) {
            return new ArrayUpdateCommand(elementsToAdd, idsToRemove, updatesToAdd)
        }
        return this.NO_UPDATE
    }

    private static toNonEmptyArray<T>(elements: T | T[], filter?: (el: T) => boolean): T[] | undefined {
        if (Array.isArray(elements)) {
            if (elements.length === 0) return undefined
            return filter ? elements.filter(filter) : elements
        }
        return (!filter || filter(elements)) ? [elements] : undefined
    }

    private static concatNotEmpty<T>(arrays: Stream<readonly T[] | undefined>): T[] | undefined {
        return arrays.filter((arr): arr is T[] => !!arr)
            .reduce((curr, next) => curr.concat(next))
    }

    private constructor(_elementsToAdd?: T[], _idsToRemove?: string[], _updatesToAdd?: Array<Update<T>>) {
        this._elementsToAdd = _elementsToAdd
        this._idsToRemove = _idsToRemove
        this._updatesToAdd = _updatesToAdd
    }

    public get added(): T[] | undefined {
        return this._elementsToAdd
    }

    public get removedIds(): string[] | undefined {
        return this._idsToRemove
    }

    public get changed(): Array<Update<T>> | undefined {
        return this._updatesToAdd
    }
}
