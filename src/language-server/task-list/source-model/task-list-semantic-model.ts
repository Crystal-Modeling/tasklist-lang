import { MultiMap, Stream } from "langium"
import { Task } from "../../generated/ast"
import * as uuid from 'uuid'

export namespace SemanticModel {
    export function is(object: any): object is SemanticModel {
        if (typeof object.id === 'string' && object.tasks && object.transitions) {
            return true
        }
        return false
    }

    export function newModel(): SemanticModel {
        return {
            id: uuid.v4(),
            tasks: {},
            transitions: {}
        }
    }

    export function newTask(task: Task): SemanticTask {
        return {
            id: uuid.v4(),
            name: task.name
        }
    }
}

export interface SemanticModel {
    id: string
    tasks: { [ID: string]: SemanticTask }
    transitions: { [ID: string]: SemanticTransition }
}

export interface SemanticTask {
    id: string
    name: string
}

export interface SemanticTransition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}


export abstract class SemanticModelIndex {
    protected readonly _model: SemanticModel
    private readonly _tasksById: Map<string, SemanticTask> = new Map()
    private readonly _tasksByName: MultiMap<string, SemanticTask> = new MultiMap()
    private readonly _transitionsById: Map<string, SemanticTransition> = new Map()

    public constructor(semanticModel: SemanticModel) {
        this._model = semanticModel
        for (const taskId in semanticModel.tasks) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.tasks, taskId)) {
                const task = semanticModel.tasks[taskId];

                this.addTaskToIndex(task)
            }
        }
        for (const transitionId in semanticModel.transitions) {
            if (Object.prototype.hasOwnProperty.call(semanticModel.transitions, transitionId)) {
                const transition = semanticModel.transitions[transitionId];

                this._transitionsById.set(transition.id, transition)
            }
        }
    }

    public removeTasks(tasks: Stream<SemanticTask>) {
        let number = 0
        tasks.forEach(task => {
            delete this._model.tasks[task.id]
            this.removeTaskFromIndex(task)

            number++
        })
        console.debug("Removed " + number + " tasks")
    }

    public addTasks(tasks: Task[]) {
        for (const task of tasks) {
            const semanticTask = SemanticModel.newTask(task)

            this._model.tasks[semanticTask.id] = semanticTask
            this.addTaskToIndex(semanticTask)
        }
        console.debug("Added " + tasks.length + " tasks")
    }

    private addTaskToIndex(task: SemanticTask): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.add(task.name, task)
    }

    private removeTaskFromIndex(task: SemanticTask): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name, task)
    }

    public get tasksByName(): MultiMap<string, SemanticTask> {
        return new MultiMap(this._tasksByName.entries().toArray())
    }

    protected get model(): SemanticModel {
        return this._model
    }
}