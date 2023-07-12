import { ArrayUpdate, Update } from '../../../langium-model-server/source/model'
import type { ElementState } from '../../../langium-model-server/source/model/element-update'
import { ElementUpdate } from '../../../langium-model-server/source/model/element-update'
import type { SourceUpdateCombiner } from '../../../langium-model-server/source/source-update-combiner'
import type { Model, Task, Transition } from './model'
import type * as id from '../../../langium-model-server/semantic/identity'
import { stream } from 'langium'

export class TaskListSourceUpdateCombiner implements SourceUpdateCombiner<Model> {

    combineUpdates(updates: Array<Update<Model>>): Update<Model> | undefined {
        if (updates.length < 1) {
            return undefined
        }
        if (updates.length === 1) {
            return updates[0]
        }
        const cumulativeUpdate: Readonly<Update<Model>> = new ModelCumulativeUpdate(updates)
        const update = Update.createEmpty<Model>(cumulativeUpdate.id)
        assignPropIfDefined(update, 'tasks', cumulativeUpdate)
        assignPropIfDefined(update, 'transitions', cumulativeUpdate)
        return update
    }

}

class ModelCumulativeUpdate implements Readonly<Update<Model>> {

    private readonly updates: Array<Update<Model>>
    private readonly taskUpdates: Array<ArrayUpdate<Task>>
    private readonly transitionUpdates: Array<ArrayUpdate<Transition>>

    public constructor(updates: Array<Update<Model>>) {
        this.updates = updates
        this.taskUpdates = updates.map(upd => upd.tasks).filter((upd): upd is ArrayUpdate<Task> => !!upd && !ArrayUpdate.isEmpty(upd))
        this.transitionUpdates = updates.map(upd => upd.transitions).filter((upd): upd is ArrayUpdate<Transition> => !!upd && !ArrayUpdate.isEmpty(upd))
    }

    get id(): string {
        return this.updates[0].id
    }

    get tasks(): ArrayUpdate<Task> | undefined {
        return mergeArrayUpdates(this.taskUpdates, (sourceUpdate, destinationUpdate) => {
            assignPropIfDefined(destinationUpdate, '__state', sourceUpdate)
            assignPropIfDefined(destinationUpdate, 'content', sourceUpdate)
            assignPropIfDefined(destinationUpdate, 'name', sourceUpdate)
        })
    }

    get transitions(): ArrayUpdate<Transition> | undefined {
        return mergeArrayUpdates(this.transitionUpdates, (sourceUpdate, destinationUpdate) => {
            assignPropIfDefined(destinationUpdate, '__state', sourceUpdate)
        })
    }

}

function mergeArrayUpdates<T extends id.SemanticIdentity>(
    arrayUpdates: Array<ArrayUpdate<T>>,
    propagateElementUpdateData: (source: ElementUpdate<T>, destination: ElementUpdate<T>) => void
): ArrayUpdate<T> | undefined {
    if (arrayUpdates.length === 0) {
        return undefined
    }
    const removedIds: Set<string> = new Set(arrayUpdates.flatMap(elementUpdate => elementUpdate.removedIds ?? []))
    const changedById: Map<string, ElementUpdate<T>> = new Map()
    stream(arrayUpdates)
        .flatMap(update => update.changed ?? [])
        .filter(elementUpdate => !removedIds.has(elementUpdate.id))
        .forEach(change => {
            const existingChange = changedById.get(change.id)
            if (!existingChange) {
                changedById.set(change.id, createElementCumulativeUpdate(change))
            } else {
                propagateElementUpdateData(change, existingChange)
            }
        })
    const added: T[] = arrayUpdates.flatMap(elementUpdate => elementUpdate.added ?? [])
    const merged: ArrayUpdate<T> = {
        added,
        // NOTE: Remapping to plain object to get rid of custom getter and setter -- they will affect JSON conversion
        changed: Array.from(changedById.values(), cumulativeUpdate => {
            const update = ElementUpdate.createEmpty<T>(cumulativeUpdate.id)
            propagateElementUpdateData(cumulativeUpdate, update)
            return update
        }),
        removedIds: Array.from(removedIds)
    }
    return merged
}

function createElementCumulativeUpdate<T extends id.SemanticIdentity>(existingUpdate: ElementUpdate<T>): ElementUpdate<T> {
    let __state = existingUpdate.__state
    const update: ElementUpdate<T> = {
        ...existingUpdate,
        set __state(newState: ElementState) {
            if (newState === 'REAPPEARED' && __state === 'DISAPPEARED') {
                __state = undefined
                delete update.__state
            } else {
                __state = newState
            }
        },
        get __state(): ElementState | undefined {
            return __state
        }
    }
    return update
}

function assignPropIfDefined<T>(destination: T, prop: keyof T, source: Readonly<Partial<T>>) {
    const value = source[prop]
    if (!!value) {
        destination[prop] = value
    }
}
