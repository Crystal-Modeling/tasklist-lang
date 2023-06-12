import type { Valid } from '../../../langium-model-server/semantic/semantic-types'
import type * as ast from '../../generated/ast'
import type { TaskListDocument } from '../workspace/documents'
import { getTaskListDocument } from '../workspace/documents'

export interface TaskListSemanticDomain {
    clear(): void
    setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidTasks, getValidTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor SemanticModelIndex is responsible for traversing AST internals
    */
    isTaskSemanticallyValid(task: ast.Task): task is Valid<ast.Task>
    isTransitionSemanticallyValid(task: Valid<ast.Task>, targetTaskIndex: number): boolean
    getValidTasks(model: ast.Model): Array<Valid<ast.Task>>
    getValidTargetTasks(task: Valid<ast.Task>): Array<Valid<ast.Task>>
}

export namespace TaskListSemanticDomain {
    export function initialize(document: TaskListDocument) {
        document.semanticDomain = new PreprocessedTaskListSemanticDomain()
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    protected invalidTasks: Set<ast.Task>
    protected invalidReferences: Map<ast.Task, Set<number>>

    constructor() {
        this.invalidTasks = new Set()
        this.invalidReferences = new Map()
    }

    public isTaskSemanticallyValid(task: ast.Task): task is Valid<ast.Task> {
        return !this.invalidTasks.has(task)
    }

    public isTransitionSemanticallyValid(task: Valid<ast.Task>, targetTaskIndex: number): boolean {
        return !this.invalidReferences.get(task)?.has(targetTaskIndex)
    }

    public getValidTasks(model: ast.Model): Array<Valid<ast.Task>> {
        const validTasks: Array<Valid<ast.Task>> = []
        model.tasks.forEach(task => {
            if (this.isTaskSemanticallyValid(task)) {
                validTasks.push(task)
            }
        })
        return validTasks
    }

    public getValidTargetTasks(sourceTask: Valid<ast.Task>): Array<Valid<ast.Task>> {
        const validTargetTasks: Array<Valid<ast.Task>> = []
        sourceTask.references.forEach((targetTaskRef, targetTaskIndex) => {
            const targetTask = targetTaskRef.ref
            if (!!targetTask && this.isTaskSemanticallyValid(targetTask)
                && this.isTransitionSemanticallyValid(sourceTask, targetTaskIndex)) {
                validTargetTasks.push(targetTask)
            }
        })
        return validTargetTasks
    }

    public clear() {
        this.invalidTasks.clear()
        this.invalidReferences.clear()
    }

    public setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        this.invalidTasks = invalidTasks
    }

    public setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void {
        this.invalidReferences.set(task, invalidReferences)
    }

}

class PreprocessedTaskListSemanticDomain extends DefaultTaskListSemanticDomain {

    private _validTasksByModel: Map<ast.Model, Array<Valid<ast.Task>>>
    private _validTargetTasksBySourceTask: Map<Valid<ast.Task>, Array<Valid<ast.Task>>>
    private areValidNodesInitialized = false

    public override clear(): void {
        this.areValidNodesInitialized = false
        this._validTasksByModel.clear()
        this._validTargetTasksBySourceTask.clear()
        super.clear()
    }

    public override getValidTasks(model: ast.Model): Array<Valid<ast.Task>> {
        if (!this.areValidNodesInitialized) {
            this.initializeValidNodes(model)
        }
        return this._validTasksByModel.get(model) ?? []
    }

    public override getValidTargetTasks(sourceTask: Valid<ast.Task>): Array<Valid<ast.Task>> {
        if (!this.areValidNodesInitialized) {
            this.initializeValidNodes(getTaskListDocument(sourceTask).parseResult.value)
        }
        return this._validTargetTasksBySourceTask.get(sourceTask) ?? []
    }

    private initializeValidNodes(model: ast.Model): void {
        const validTasks: Array<Valid<ast.Task>> = []
        model.tasks.forEach(task => {
            if (this.isTaskSemanticallyValid(task)) {
                validTasks.push(task)
                this._validTargetTasksBySourceTask.set(task, super.getValidTargetTasks(task))
            }
        })
        this._validTasksByModel.set(model, validTasks)
        this.areValidNodesInitialized = true
    }

}
