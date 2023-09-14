import type { AstNodeSemanticIdentity, DerivativeSemanticIdentity, Renameable } from '../../../langium-model-server/identity/model'
import { ModelUri } from '../../../langium-model-server/identity/model'
import type { IdentityIndex } from '../../../langium-model-server/identity'
import { ValueBasedMap, equal } from '../../../langium-model-server/utils/collections'
import type { Model, Task, TransitionDerivativeName } from './model'
import { Transition } from './model'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    private readonly _tasksById: Map<string, Task> = new Map()
    private readonly _tasksByName: Map<string, Task> = new Map()
    private readonly _transitionsById: Map<string, Transition> = new Map()
    private readonly _transitionsByName: ValueBasedMap<TransitionDerivativeName, Transition>
        = new ValueBasedMap()

    public constructor(identityModel: Model) {
        this.id = identityModel.id
        identityModel.tasks.forEach(this.addTask.bind(this))
        identityModel.transitions.forEach(this.addTransition.bind(this))
    }

    public get tasksByName(): Map<string, Readonly<Task>> {
        return new Map(this._tasksByName)
    }

    public get transitionsByName(): ValueBasedMap<TransitionDerivativeName, Readonly<Transition>> {
        return this._transitionsByName.copy()
    }

    protected get model(): Model {
        return {
            id: this.id,
            tasks: Array.from(this._tasksById.values()),
            transitions: Array.from(this._transitionsById.values())
        }
    }

    public findAstNodeIdentityById(id: string): Renameable<AstNodeSemanticIdentity> | undefined {
        const taskIdentity = this._tasksById.get(id)
        if (taskIdentity) {
            const index = this
            return {
                id: taskIdentity.id,
                get name(): string {
                    return taskIdentity.name
                },
                // TODO: Here I hardcode ModelUri of Task -- it should be taken from some centralized place (LMS grammar?)
                get modelUri(): string {
                    return ModelUri.ofSegments(
                        ModelUri.Segment.property('tasks'),
                        ModelUri.Segment.id(taskIdentity.id)
                    )
                },
                updateName(newName): boolean {
                    if (taskIdentity.name !== newName) {
                        if (index._tasksByName.delete(taskIdentity.name))
                            index._tasksByName.set(newName, taskIdentity)
                        taskIdentity.name = newName
                        return true
                    }
                    return false
                },
            }
        }
        return undefined
    }

    public findTransitionIdentityById(id: string): Renameable<DerivativeSemanticIdentity<TransitionDerivativeName>> | undefined {
        const transitionIdentity = this._transitionsById.get(id)
        if (transitionIdentity) {
            const index = this
            let name = Transition.name(transitionIdentity)
            return {
                id: transitionIdentity.id,
                get name() {
                    return name
                },
                // TODO: Here I hardcode ModelUri of Transition -- it should be taken from some centralized place (LMS grammar?)
                get modelUri(): string {
                    return ModelUri.ofSegments(
                        ModelUri.Segment.property('transitions'),
                        ModelUri.Segment.id(transitionIdentity.id)
                    )
                },
                updateName(newName): boolean {
                    if (!equal(name, newName)) {
                        if (index._transitionsByName.delete(name))
                            index._transitionsByName.set(newName, transitionIdentity)
                        name = newName
                        transitionIdentity.sourceTaskId = name[0]
                        transitionIdentity.targetTaskId = name[1]
                        return true
                    }
                    return false
                },
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
        this._transitionsByName.set(Transition.name(transition), transition)
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
            this._transitionsByName.delete(Transition.name(transition))
        }
    }
}
