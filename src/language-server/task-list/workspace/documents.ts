import type { LangiumDocument } from 'langium'
import { getDocument } from 'langium'
import type { Valid } from '../../../langium-model-server/semantic/semantic-types'
import type * as ast from '../../generated/ast'
import { isModel } from '../../generated/ast'

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export interface TaskListDocument extends LangiumDocument<ast.Model> {
    /**
     * This property is initialized during Validation phase to be considered during Semantic Reconciliation phase
     */
    semanticDomain?: TaskListSemanticDomain
}

export function isTaskListDocument(document: LangiumDocument): document is TaskListDocument {
    return isModel(document.parseResult.value)
}

export function getTaskListDocument(node: ast.Model | ast.Task): TaskListDocument {
    return getDocument(node)
}

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
        document.semanticDomain = new DefaultTaskListSemanticDomain()
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

    public getValidTargetTasks(task: Valid<ast.Task>): Array<Valid<ast.Task>> {
        const validTargetTasks: Array<Valid<ast.Task>> = []
        task.references.forEach((targetTaskRef, targetTaskIndex) => {
            const targetTask = targetTaskRef.ref
            if (!!targetTask && this.isTaskSemanticallyValid(targetTask)
                && this.isTransitionSemanticallyValid(task, targetTaskIndex)) {
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
