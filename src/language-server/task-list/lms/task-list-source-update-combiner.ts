import { stream } from 'langium'
import type * as id from '../../../langium-model-server/semantic/identity'
import { ArrayUpdate, Update } from '../../../langium-model-server/lms/model'
import type { ElementAttributes, ElementUpdate } from '../../../langium-model-server/lms/model'
import type { SourceUpdateCombiner } from '../../../langium-model-server/lms/source-update-combiner'
import type { Model, Task, Transition } from './model'

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
        this.taskUpdates = updates.map(upd => upd.tasks)
            .filter((upd): upd is ArrayUpdate<Task> => !!upd && !ArrayUpdate.isEmpty(upd))
        this.transitionUpdates = updates.map(upd => upd.transitions)
            .filter((upd): upd is ArrayUpdate<Transition> => !!upd && !ArrayUpdate.isEmpty(upd))
    }

    get id(): string {
        return this.updates[0].id
    }

    get tasks(): ArrayUpdate<Task> | undefined {
        return mergeArrayUpdates(this.taskUpdates, 'content', 'name')
    }

    get transitions(): ArrayUpdate<Transition> | undefined {
        return mergeArrayUpdates(this.transitionUpdates)
    }

}

function mergeArrayUpdates<T extends id.SemanticIdentity>(
    arrayUpdates: Array<ArrayUpdate<T>>,
    ...mutableProps: Array<ElementAttributes<T>>
): ArrayUpdate<T> | undefined {
    const propagateElementUpdateData = (source: ElementUpdate<T>, destination: ElementUpdate<T>) => {
        if (source.__state === 'REAPPEARED' && destination.__state === 'DISAPPEARED') {
            delete destination.__state
        } else {
            assignPropIfDefined(destination, '__state', source)
        }
        for (const mutableProp of mutableProps) {
            assignPropIfDefined(destination, mutableProp, source)
        }
    }

    if (arrayUpdates.length === 0) {
        return undefined
    }
    const removedIds: Set<string> = new Set(arrayUpdates.flatMap(update => update.removedIds ?? []))
    const changedById: Map<string, ElementUpdate<T>> = new Map()
    stream(arrayUpdates)
        .flatMap(update => update.changed ?? [])
        .filter(elementUpdate => !removedIds.has(elementUpdate.id))
        .forEach(change => {
            const existingChange = changedById.get(change.id)
            if (!existingChange) {
                changedById.set(change.id, { ...change })
            } else {
                propagateElementUpdateData(change, existingChange)
            }
        })
    const added: T[] = arrayUpdates.flatMap(update => update.added ?? [])
        .filter(elementUpdate => !removedIds.delete(elementUpdate.id))
    const merged: ArrayUpdate<T> = {
        added,
        changed: Array.from(changedById.values()),
        removedIds: Array.from(removedIds)
    }
    return merged
}

function assignPropIfDefined<T>(destination: T, prop: keyof T, source: Readonly<Partial<T>>) {
    const value = source[prop]
    if (!!value) {
        destination[prop] = value
    }
}
