import { MultiMap } from 'langium'
import type { NamedSemanticIdentity } from '../../../langium-model-server/semantic/identity'
import type { IdentityIndex } from '../../../langium-model-server/semantic/identity-index'
import { ValueBasedMap } from '../../../langium-model-server/utils/collections'
import type { Model, Task, Transition, TransitionDerivativeIdentity } from './task-list-identity'

//TODO: The only reason why I keep _*byId index maps is because I am not certain of the _model format. Probably needs to be removed
export abstract class TaskListIdentityIndex implements IdentityIndex {
    protected readonly _model: Model
    private readonly _tasksById: Map<string, Task> = new Map()
    private readonly _tasksByName: Map<string, Task> = new Map()
    private readonly _transitionsById: Map<string, Transition> = new Map()
    private readonly _transitionsByTaskId: MultiMap<string, Transition> = new MultiMap()
    private readonly _transitionsByDerivativeIdentity: ValueBasedMap<TransitionDerivativeIdentity, Transition>
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

    public get transitionsByDerivativeIdentity(): ValueBasedMap<TransitionDerivativeIdentity, Readonly<Transition>> {
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

    public deleteTasksWithRelatedTransitions(tasks: Iterable<Task>) {
        for (const task of tasks) {
            this.deleteTask(task)
            this.deleteTransitionsForTask(task.id)
        }
    }

    private addTaskToIndex(task: Task): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    private deleteTask(task: Task) {
        delete this._model.tasks[task.id]
        this.removeTaskFromIndex(task)
    }

    private removeTaskFromIndex(task: Task): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name)
    }

    public addTransition(transition: Transition) {
        this._model.transitions[transition.id] = transition
        this.addTransitionToIndex(transition)
    }

    public deleteTransitions(transitions: Iterable<Transition>) {
        for (const transition of transitions) {
            this.deleteTransition(transition)
        }
    }

    private deleteTransitionsForTask(sourceTaskId: string) {
        for (const transition of this._transitionsByTaskId.get(sourceTaskId)) {
            this.deleteTransition(transition)
        }
    }

    private addTransitionToIndex(transition: Transition): void {
        this._transitionsById.set(transition.id, transition)
        this._transitionsByTaskId.add(transition.sourceTaskId, transition)
        this._transitionsByTaskId.add(transition.targetTaskId, transition)
        this._transitionsByDerivativeIdentity.set([transition.sourceTaskId, transition.targetTaskId], transition)
    }

    private deleteTransition(transition: Transition) {
        delete this._model.transitions[transition.id]
        this.removeTransitionFromIndex(transition)
    }

    private removeTransitionFromIndex(transition: Transition) {
        this._transitionsById.delete(transition.id)
        this._transitionsByTaskId.delete(transition.sourceTaskId, transition)
        this._transitionsByTaskId.delete(transition.targetTaskId, transition)
        this._transitionsByDerivativeIdentity.delete([transition.sourceTaskId, transition.targetTaskId])
    }
}
