import type { NamedSemanticIdentity } from '../../../langium-model-server/semantic/identity'
import type { IdentityIndex } from '../../../langium-model-server/semantic/identity-index'
import { ValueBasedMap } from '../../../langium-model-server/utils/collections'
import type * as semantic from './model'
import type { Model, Task, Transition } from './task-list-identity'

//TODO: The only reason why I keep _*byId index maps is because I am not certain of the _model format. Probably needs to be removed
export abstract class TaskListIdentityIndex implements IdentityIndex {
    protected readonly _model: Model
    private readonly _tasksById: Map<string, Task> = new Map()
    private readonly _tasksByName: Map<string, Task> = new Map()
    private readonly _transitionsById: Map<string, Transition> = new Map()
    private readonly _transitionsByDerivativeIdentity: ValueBasedMap<semantic.TransitionDerivativeIdentity, Transition>
        = new ValueBasedMap()

    public constructor(semanticModel: Model) {
        this._model = semanticModel
        for (const taskId in semanticModel.tasks) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.tasks, taskId)) {
                this.addTaskToIndex(semanticModel.tasks[taskId])
            }
        }
        for (const transitionId in semanticModel.transitions) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.transitions, transitionId)) {
                this.addTransitionToIndex(semanticModel.transitions[transitionId])
            }
        }
    }

    public get id(): string {
        return this._model.id
    }

    public get transitions(): Iterable<Readonly<Transition>> {
        return this._transitionsById.values()
    }

    public get tasksByName(): Map<string, Readonly<Task>> {
        return new Map(this._tasksByName)
    }

    public get transitionsByDerivativeIdentity(): ValueBasedMap<semantic.TransitionDerivativeIdentity, Readonly<Transition>> {
        return this._transitionsByDerivativeIdentity.copy()
    }

    protected get model(): Model {
        return this._model
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
        this._model.tasks[task.id] = task
        this.addTaskToIndex(task)
    }

    public deleteTasks(taskIds: Iterable<string>) {
        for (const id of taskIds) {
            this.deleteTask(id)
        }
    }

    private addTaskToIndex(task: Task): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    private deleteTask(taskId: string) {
        //TODO: Fix the model: there can be no task/transition for some ID
        const task = this._model.tasks[taskId]
        if (task) {
            delete this._model.tasks[taskId]
            this.removeTaskFromIndex(task)
        }
    }

    private removeTaskFromIndex(task: Task): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name)
    }

    public addTransition(transition: Transition) {
        this._model.transitions[transition.id] = transition
        this.addTransitionToIndex(transition)
    }

    public deleteTransitions(transitionIds: Iterable<string>) {
        for (const id of transitionIds) {
            this.deleteTransition(id)
        }
    }

    private addTransitionToIndex(transition: Transition): void {
        this._transitionsById.set(transition.id, transition)
        this._transitionsByDerivativeIdentity.set([transition.sourceTaskId, transition.targetTaskId], transition)
    }

    private deleteTransition(transitionId: string) {
        const transition = this._model.transitions[transitionId]
        if (transition) {
            delete this._model.transitions[transitionId]
            this.removeTransitionFromIndex(transition)
        }
    }

    private removeTransitionFromIndex(transition: Transition) {
        this._transitionsById.delete(transition.id)
        this._transitionsByDerivativeIdentity.delete([transition.sourceTaskId, transition.targetTaskId])
    }
}
