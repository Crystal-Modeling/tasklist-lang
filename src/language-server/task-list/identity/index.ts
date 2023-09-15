import type { IdentityIndex } from '../../../langium-model-server/identity'
import type { SemanticPropertyName } from '../../../langium-model-server/identity/model'
import { ModelUri, SemanticIdentity } from '../../../langium-model-server/identity/model'
import { ValueBasedMap, equal } from '../../../langium-model-server/utils/collections'
import type { TaskIdentity, TransitionIdentity } from './model'
import { TransitionDerivativeName } from './model'
import { Task, Transition, type IdentityModel } from './storage'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    private readonly _tasksById: Map<string, TaskIdentity> = new Map()
    private readonly _tasksByName: Map<string, TaskIdentity> = new Map()
    private readonly _transitionsById: Map<string, TransitionIdentity> = new Map()
    private readonly _transitionsByName: ValueBasedMap<TransitionDerivativeName, TransitionIdentity>
        = new ValueBasedMap()

    public constructor(identityModel: IdentityModel) {
        this.id = identityModel.id
        identityModel.tasks.forEach(task => this.addTask(task.id, task.name))
        identityModel.transitions.forEach(transition => this.addTransition(transition.id, TransitionDerivativeName.ofProperties(transition)))
    }

    public get tasksByName(): Map<string, Readonly<TaskIdentity>> {
        return new Map(this._tasksByName)
    }

    public get transitionsByName(): ValueBasedMap<TransitionDerivativeName, Readonly<TransitionIdentity>> {
        return this._transitionsByName.copy()
    }

    protected get model(): IdentityModel {
        return {
            id: this.id,
            tasks: Array.from(this._tasksById.values(), Task.of),
            transitions: Array.from(this._transitionsById.values(), Transition.of)
        }
    }

    public addNewTask(name: SemanticPropertyName): TaskIdentity {
        return this.addTask(SemanticIdentity.generate(), name)
    }

    public deleteTasks(taskIds: Iterable<string>) {
        for (const id of taskIds) {
            this.deleteTask(id)
        }
    }

    public addNewTransition(name: TransitionDerivativeName): TransitionIdentity {
        return this.addTransition(SemanticIdentity.generate(), name)
    }

    public deleteTransitions(transitionIds: Iterable<string>) {
        for (const id of transitionIds) {
            this.deleteTransition(id)
        }
    }

    private addTask(id: string, name: SemanticPropertyName): TaskIdentity {
        const index = this
        const taskIdentity = {
            id,
            name,
            // TODO: Here I hardcode ModelUri of Task -- it should be taken from some centralized place (LMS grammar?)
            modelUri: ModelUri.ofSegments(
                ModelUri.Segment.property('tasks'),
                ModelUri.Segment.id(id)
            ),

            updateName(newName: string): boolean {
                if (taskIdentity.name !== newName) {
                    if (index._tasksByName.delete(taskIdentity.name))
                        index._tasksByName.set(newName, taskIdentity)
                    taskIdentity.name = newName
                    return true
                }
                return false
            },

            delete(): boolean {
                index._tasksByName.delete(taskIdentity.name)
                return index._tasksById.delete(taskIdentity.id)
            }
        }

        this._tasksById.set(taskIdentity.id, taskIdentity)
        this._tasksByName.set(taskIdentity.name, taskIdentity)
        return taskIdentity
    }

    private addTransition(id: string, name: TransitionDerivativeName): TransitionIdentity {
        const index = this
        const transitionIdentity = {
            id,
            name,
            // TODO: Here I hardcode ModelUri of Transition -- it should be taken from some centralized place (LMS grammar?)
            modelUri: ModelUri.ofSegments(
                ModelUri.Segment.property('transitions'),
                ModelUri.Segment.id(id)
            ),

            updateName(newName: TransitionDerivativeName): boolean {
                if (!equal(transitionIdentity.name, newName)) {
                    if (index._transitionsByName.delete(transitionIdentity.name))
                        index._transitionsByName.set(newName, transitionIdentity)
                    transitionIdentity.name = newName
                    return true
                }
                return false
            },

            delete(): boolean {
                index._transitionsByName.delete(transitionIdentity.name)
                return index._transitionsById.delete(transitionIdentity.id)
            }
        }

        this._transitionsById.set(transitionIdentity.id, transitionIdentity)
        this._transitionsByName.set(transitionIdentity.name, transitionIdentity)
        return transitionIdentity
    }

    private deleteTask(taskId: string) {
        const task = this._tasksById.get(taskId)
        if (task) {
            this._tasksById.delete(task.id)
            this._tasksByName.delete(task.name)
        }
    }

    private deleteTransition(transitionId: string) {
        const transition = this._transitionsById.get(transitionId)
        if (transition) {
            this._transitionsById.delete(transition.id)
            this._transitionsByName.delete(transition.name)
        }
    }
}
