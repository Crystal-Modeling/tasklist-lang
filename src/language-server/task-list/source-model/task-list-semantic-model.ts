import * as uuid from 'uuid'
import { Task } from "../../generated/ast"
import { isDefinedObject, isMappedObject } from '../../../source-model-server/source-model/typing-utils'

export namespace SemanticModel {
    export function is(obj: unknown): obj is SemanticModel {
        if (!isDefinedObject(obj)) {
            return false
        }
        if (typeof obj.id !== 'string'
            || !isMappedObject(obj.tasks, 'string', isSemanticTask)
            || !isMappedObject(obj.transitions, 'string', isSemanticTransition)) {
            return false
        }

        return true
    }

    function isSemanticTask(obj: unknown): obj is SemanticTask {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.name === 'string'
    }

    function isSemanticTransition(obj: unknown): obj is SemanticTransition {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
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
    private readonly _tasksByName: Map<string, SemanticTask> = new Map()
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

    public removeTasks(tasks: Iterable<SemanticTask>) {
        let number = 0
        for (const task of tasks) {
            number++

            delete this._model.tasks[task.id]
            this.removeTaskFromIndex(task)
        }
        console.debug("Removed " + number + " tasks")
    }

    public addTasks(tasks: Iterable<Task>) {
        let number = 0
        for (const task of tasks) {
            const semanticTask = SemanticModel.newTask(task)
            number++

            this._model.tasks[semanticTask.id] = semanticTask
            this.addTaskToIndex(semanticTask)
        }
        console.debug("Added " + number + " tasks")
    }

    private addTaskToIndex(task: SemanticTask): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    private removeTaskFromIndex(task: SemanticTask): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name)
    }

    public get tasksByName(): Map<string, SemanticTask> {
        return new Map(this._tasksByName)
    }

    protected get model(): SemanticModel {
        return this._model
    }
}