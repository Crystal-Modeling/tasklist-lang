import { MultiMap, Stream, stream } from 'langium'
import * as uuid from 'uuid'
import { isDefinedObject, isMappedObject } from '../../../source-model-server/source-model/typing-utils'
import { Task } from "../../generated/ast"

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

    export function newTransition(sourceTaskId: string, targetTaskId: string): SemanticTransition {
        return {
            id: uuid.v4(),
            sourceTaskId,
            targetTaskId
        }
    }
}


export abstract class SemanticModelIndex {
    protected readonly _model: SemanticModel
    private readonly _tasksById: Map<string, SemanticTask> = new Map()
    private readonly _tasksByName: Map<string, SemanticTask> = new Map()
    private readonly _transitionsById: Map<string, SemanticTransition> = new Map()
    private readonly _transitionsByTaskId: MultiMap<string, SemanticTransition> = new MultiMap()
    private readonly _transitionsBySourceTaskIdAndTargetTaskId: Map<[string, string], SemanticTransition> = new Map()

    public constructor(semanticModel: SemanticModel) {
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

    public get tasksByName(): Map<string, SemanticTask> {
        return new Map(this._tasksByName)
    }

    public get transitionsBySourceTaskIdAndTargetTaskId(): Map<[string, string], SemanticTransition> {
        return new Map(this._transitionsBySourceTaskIdAndTargetTaskId)
    }

    protected get model(): SemanticModel {
        return this._model
    }

    public addTasksWithTransitionsFrom(tasks: Iterable<Task>,
        validTargetSemanticTaskIdsGetter: (sourceTask: Task) => Stream<string>) {
        const semanticTasksWithTasks = stream(tasks)
            .map((task): [SemanticTask, Task] => [SemanticModel.newTask(task), task])
        semanticTasksWithTasks
            .forEach(([semanticTask,]) => this.newTask(semanticTask))

        semanticTasksWithTasks.forEach(([semanticTask, sourceTask]) => {
            const sourceTaskId = semanticTask.id
            validTargetSemanticTaskIdsGetter(sourceTask)
                .forEach(id => this.newTransition(SemanticModel.newTransition(sourceTaskId, id)))
        })
    }

    public addTransitionsForSourceTaskId(transitions: Iterable<[string, Task]>, semanticTaskIdGetter: (task: Task) => string | undefined) {
        for (const [sourceTaskId, targetTask] of transitions) {
            const targetTaskId = semanticTaskIdGetter(targetTask)
            if (targetTaskId) {
                this.newTransition(SemanticModel.newTransition(sourceTaskId, targetTaskId))
            }
        }
    }

    public getTaskIdByName(name: string): string | undefined {
        return this._tasksByName.get(name)?.id
    }

    public removeTasksWithRelatedTransitions(tasks: Iterable<SemanticTask>) {
        for (const task of tasks) {
            this.deleteTask(task)
            this.removeTransitionsForTask(task.id)
        }
    }

    public removeTransitions(transitions: Iterable<SemanticTransition>) {
        for (const transition of transitions) {
            this.deleteTransition(transition)
        }
    }

    private removeTransitionsForTask(sourceTaskId: string) {
        for (const transition of this._transitionsByTaskId.get(sourceTaskId)) {
            this.deleteTransition(transition)
        }
    }

    private newTask(task: SemanticTask) {
        this._model.tasks[task.id] = task
        this.addTaskToIndex(task)
    }

    private addTaskToIndex(task: SemanticTask): void {
        this._tasksById.set(task.id, task)
        this._tasksByName.set(task.name, task)
    }

    private deleteTask(task: SemanticTask) {
        delete this._model.tasks[task.id]
        this.removeTaskFromIndex(task)
    }

    private removeTaskFromIndex(task: SemanticTask): void {
        this._tasksById.delete(task.id)
        this._tasksByName.delete(task.name)
    }

    private newTransition(transition: SemanticTransition) {
        this._model.transitions[transition.id] = transition
        this.addTransitionToIndex(transition)
    }

    private addTransitionToIndex(transition: SemanticTransition): void {
        this._transitionsById.set(transition.id, transition)
        this._transitionsByTaskId.add(transition.sourceTaskId, transition)
        this._transitionsByTaskId.add(transition.targetTaskId, transition)
        this._transitionsBySourceTaskIdAndTargetTaskId.set([transition.sourceTaskId, transition.targetTaskId], transition)
    }

    private deleteTransition(transition: SemanticTransition) {
        delete this._model.transitions[transition.id]
        this.removeTransitionFromIndex(transition)
    }

    private removeTransitionFromIndex(transition: SemanticTransition) {
        this._transitionsById.delete(transition.id)
        this._transitionsByTaskId.delete(transition.sourceTaskId, transition)
        this._transitionsByTaskId.delete(transition.targetTaskId, transition)
        this._transitionsBySourceTaskIdAndTargetTaskId.delete([transition.sourceTaskId, transition.targetTaskId])
    }
}