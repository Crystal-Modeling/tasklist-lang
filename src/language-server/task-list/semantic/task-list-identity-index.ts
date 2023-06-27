import type { NamedSemanticIdentity } from '../../../langium-model-server/semantic/identity'
import type { IdentityIndex } from '../../../langium-model-server/semantic/identity-index'
import { ValueBasedMap } from '../../../langium-model-server/utils/collections'
import type * as semantic from './model'
import type { Model, Task, Transition } from './task-list-identity'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    private readonly _tasksById: Map<string, Task> = new Map()
    private readonly _tasksByName: Map<string, Task> = new Map()
    private readonly _transitionsById: Map<string, Transition> = new Map()
    private readonly _transitionsByDerivativeIdentity: ValueBasedMap<semantic.TransitionDerivativeIdentity, Transition>
        = new ValueBasedMap()

    public constructor(identityModel: Model) {
        this.id = identityModel.id
        identityModel.tasks.forEach(this.addTask.bind(this))
        identityModel.transitions.forEach(this.addTransition.bind(this))
    }

    public get tasksByName(): Map<string, Readonly<Task>> {
        return new Map(this._tasksByName)
    }

    public get transitionsByDerivativeIdentity(): ValueBasedMap<semantic.TransitionDerivativeIdentity, Readonly<Transition>> {
        return this._transitionsByDerivativeIdentity.copy()
    }

    protected get model(): Model {
        return {
            id: this.id,
            tasks: Array.from(this._tasksById.values()),
            transitions: Array.from(this._transitionsById.values())
        }
    }

    public getTaskIdByName(name: string): string | undefined {
        return this._tasksByName.get(name)?.id
    }

    public findElementByName(name: string): NamedSemanticIdentity | undefined {
        const semanticTask = this._tasksByName.get(name)
        if (semanticTask) {
            const index = this
            return {
                id: semanticTask.id,
                get name(): string {
                    return semanticTask.name
                },
                set name(newName: string) {
                    if (index._tasksByName.delete(semanticTask.name))
                        index._tasksByName.set(newName, semanticTask)
                    semanticTask.name = newName
                }
            }
        }
        return undefined
    }

    public addTask(task: Task) {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    public deleteTasks(taskIds: Iterable<string>) {
        for (const id of taskIds) {
            this.deleteTask(id)
        }
    }

    private deleteTask(taskId: string) {
        const task = this._tasksById.get(taskId)
        if (task) {
            this._tasksById.delete(task.id)
            this._tasksByName.delete(task.name)
        }
    }

    public addTransition(transition: Transition) {
        this._transitionsById.set(transition.id, transition)
        this._transitionsByDerivativeIdentity.set([transition.sourceTaskId, transition.targetTaskId], transition)
    }

    public deleteTransitions(transitionIds: Iterable<string>) {
        for (const id of transitionIds) {
            this.deleteTransition(id)
        }
    }

    private deleteTransition(transitionId: string) {
        const transition = this._transitionsById.get(transitionId)
        if (transition) {
            this._transitionsById.delete(transition.id)
            this._transitionsByDerivativeIdentity.delete([transition.sourceTaskId, transition.targetTaskId])
        }
    }
}
