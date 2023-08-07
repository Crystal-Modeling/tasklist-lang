import type { RenameableSemanticIdentity } from '../../../langium-model-server/semantic/identity'
import type { IdentityIndex } from '../../../langium-model-server/semantic/identity-index'
import { ValueBasedMap, equal } from '../../../langium-model-server/utils/collections'
import type * as semantic from './model'
import type { Model, Task, TaskListDerivativeNameBuilder} from './task-list-identity'
import { Transition } from './task-list-identity'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    private readonly _tasksById: Map<string, Task> = new Map()
    private readonly _tasksByName: Map<string, Task> = new Map()
    private readonly _transitionsById: Map<string, Transition> = new Map()
    private readonly _transitionsByName: ValueBasedMap<semantic.TransitionDerivativeName, Transition>
        = new ValueBasedMap()

    public constructor(identityModel: Model) {
        this.id = identityModel.id
        identityModel.tasks.forEach(this.addTask.bind(this))
        identityModel.transitions.forEach(this.addTransition.bind(this))
    }

    public get tasksByName(): Map<string, Readonly<Task>> {
        return new Map(this._tasksByName)
    }

    public get transitionsByName(): ValueBasedMap<semantic.TransitionDerivativeName, Readonly<Transition>> {
        return this._transitionsByName.copy()
    }

    protected get model(): Model {
        return {
            id: this.id,
            tasks: Array.from(this._tasksById.values()),
            transitions: Array.from(this._transitionsById.values())
        }
    }

    public findElementByName(name: string): RenameableSemanticIdentity<string> | undefined {
        const taskIdentity = this._tasksByName.get(name)
        if (taskIdentity) {
            const index = this
            return {
                id: taskIdentity.id,
                get name(): string {
                    return taskIdentity.name
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

    // NOTE: Looking for a derived element, but since it is used by lang-specific component (task-list-facade), `Transition` name is specific (not `DerivedElement`)
    // NOTE: No, it should rather be a generic component, since it has to be **renameable**. I can use TypeGuard to specify which kind of `DerivedElement` I want
    public findDerivedElementById(id: string, nameBuilder: TaskListDerivativeNameBuilder): RenameableSemanticIdentity<ReturnType<TaskListDerivativeNameBuilder['buildName']>> | undefined {
        if (nameBuilder.kind === Transition.KIND) {
            const transitionIdentity = this._transitionsById.get(id)
            if (transitionIdentity) {
                const index = this
                let name = nameBuilder.buildName(transitionIdentity)
                return {
                    id: transitionIdentity.id,
                    get name() {
                        return name
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
        this._transitionsByName.set([transition.sourceTaskId, transition.targetTaskId], transition)
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
            this._transitionsByName.delete([transition.sourceTaskId, transition.targetTaskId])
        }
    }
}
