import type { Stream } from 'langium'
import { stream } from 'langium'
import type { WithSemanticID } from '../../../identity/semantic-id'
import type { ElementUpdate } from './element-update'
import { Update } from './update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type ArrayUpdate<T extends WithSemanticID> = {
    added?: T[],
    removedIds?: string[],
    changed?: Array<ElementUpdate<T>>
}

export type ReadonlyArrayUpdate<T extends WithSemanticID> = {
    readonly added?: readonly T[],
    readonly removedIds?: readonly string[]
    readonly changed?: ReadonlyArray<ElementUpdate<T>>
}

export namespace ArrayUpdate {

    export function isEmpty<T extends WithSemanticID>(arrayUpdate: ReadonlyArrayUpdate<T>): boolean {
        return !arrayUpdate.added && !arrayUpdate.removedIds && !arrayUpdate.changed
    }

    // FIXME: A quick solution to ensure API contracts (object getters are not available during JSON.toString)
    export function create<T extends WithSemanticID>(readonlyUpdate: ReadonlyArrayUpdate<T>): ArrayUpdate<T> {
        const result = createEmpty<T>()
        apply(result, readonlyUpdate)
        return result
    }

    export function createEmpty<T extends WithSemanticID>(): ArrayUpdate<T> {
        return {}
    }

    export function apply<T extends WithSemanticID>(arrayUpdate: ArrayUpdate<T>, arrayUpdateCommand: ReadonlyArrayUpdate<T>): void {
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

export class ArrayUpdateCommand<T extends WithSemanticID> implements ReadonlyArrayUpdate<T> {

    private static NO_UPDATE = Object.seal({})

    protected _elementsToAdd?: T[]
    protected _idsToRemove?: string[]
    protected _updatesToAdd?: Array<ElementUpdate<T>>

    public static addition<T extends WithSemanticID>(element: T): ReadonlyArrayUpdate<T>
    public static addition<T extends WithSemanticID>(elements: T[]): ReadonlyArrayUpdate<T>
    public static addition<T extends WithSemanticID>(elements: T | T[]): ReadonlyArrayUpdate<T> {
        const elementsToAdd = this.toNonEmptyArray(elements)
        if (elementsToAdd) {
            return new ArrayUpdateCommand(elementsToAdd)
        }
        return this.NO_UPDATE
    }

    public static deletion<T extends WithSemanticID>(idsToRemove: string[]): ReadonlyArrayUpdate<T> {
        if (idsToRemove.length !== 0) {
            return new ArrayUpdateCommand(undefined, idsToRemove)
        }
        return this.NO_UPDATE
    }

    public static modification<T extends WithSemanticID>(update: ElementUpdate<T>): ReadonlyArrayUpdate<T>
    public static modification<T extends WithSemanticID>(updates: Array<ElementUpdate<T>>): ReadonlyArrayUpdate<T>
    public static modification<T extends WithSemanticID>(updates: ElementUpdate<T> | Array<ElementUpdate<T>>): ReadonlyArrayUpdate<T> {
        const updatesToAdd = this.toNonEmptyArray(updates, (upd) => !Update.isEmpty(upd))
        if (updatesToAdd) {
            return new ArrayUpdateCommand(undefined, undefined, updatesToAdd)
        }
        return this.NO_UPDATE
    }

    public static noUpdate<T extends WithSemanticID>(): ReadonlyArrayUpdate<T> {
        return this.NO_UPDATE
    }

    public static all<T extends WithSemanticID>(...updates: Array<ReadonlyArrayUpdate<T>>): ReadonlyArrayUpdate<T> {
        const updatesStream = stream(updates).filter(upd => upd !== this.NO_UPDATE)
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

    private constructor(_elementsToAdd?: T[], _idsToRemove?: string[], _updatesToAdd?: Array<ElementUpdate<T>>) {
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

    public get changed(): Array<ElementUpdate<T>> | undefined {
        return this._updatesToAdd
    }
}
