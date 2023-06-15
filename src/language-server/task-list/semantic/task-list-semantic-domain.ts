import type { Valid } from '../../../langium-model-server/semantic/model'
import { Identified } from '../../../langium-model-server/semantic/model'
import type * as ast from '../../generated/ast'
import type { TaskListDocument } from '../workspace/documents'
import { getTaskListDocument } from '../workspace/documents'
import type { TransitionDerivativeIdentity } from './model'
import { IdentifiedTransition } from './model'

export interface QueriableTaskListSemanticDomain {
    getIdentifiedTasks(): Iterable<Identified<ast.Task>>
    getIdentifiedTransitions(): Iterable<IdentifiedTransition>
    getPreviousIdentifiedTask(id: string): Identified<ast.Task> | undefined
    getPreviousIdentifiedTransition(id: string): IdentifiedTransition | undefined
}
export interface TaskListSemanticDomain extends QueriableTaskListSemanticDomain {
    clear(): void
    setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    // NOTE: 👇 This is considered as part of manipulation with AST Nodes
    getValidTasks(model: ast.Model): Array<Valid<ast.Task>>
    getValidTargetTasks(sourceTask: Valid<ast.Task>): Array<Valid<ast.Task>>
    // NOTE: 👇 This is considered as part of manipulation with Semantic Model (Identified<ast.Task> and IdentifiedTransition)
    /**
     * Maps Valid Task node with semantic identity.
     * @param task Valid AST Task node
     * @param semanticId Id, which {@link task} is identified with
     */
    identifyTask(task: Valid<ast.Task>, semanticId: string): Identified<ast.Task>
    /**
     * Maps Transition derivative identity (there is no AST node corresponded to Transition model,
     * but only a cross reference)
     * @param transition A derivative identity for Transition to map
     * @param semanticId Semantic ID, which {@link transition} is identified with
     */
    identifyTransition(transition: TransitionDerivativeIdentity, semanticId: string): IdentifiedTransition
}

export namespace TaskListSemanticDomain {
    export function initialize(document: TaskListDocument) {
        document.semanticDomain = new PreprocessedTaskListSemanticDomain()
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    protected invalidTasks: Set<ast.Task>
    protected invalidReferences: Map<ast.Task, Set<number>>

    private _identifiedTasksById: Map<string, Identified<ast.Task>>
    private _previousIdentifiedTaskById: Map<string, Identified<ast.Task>> | undefined
    private _identifiedTransitionsById: Map<string, IdentifiedTransition>
    private _previousIdentifiedTransitionsById: Map<string, IdentifiedTransition> | undefined

    constructor() {
        this.invalidTasks = new Set()
        this.invalidReferences = new Map()
        this._identifiedTasksById = new Map()
        this._identifiedTransitionsById = new Map()
    }

    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidTasks, getValidTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor SemanticModelIndex is responsible for traversing AST internals
    */
    protected isTaskSemanticallyValid(task: ast.Task): task is Valid<ast.Task> {
        return !this.invalidTasks.has(task)
    }

    protected isTransitionSemanticallyValid(task: Valid<ast.Task>, targetTaskIndex: number): boolean {
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

    public identifyTask(task: Valid<ast.Task>, semanticId: string): Identified<ast.Task> {
        const identifiedTask = Identified.identify(task, semanticId)
        this._identifiedTasksById.set(semanticId, identifiedTask)
        return identifiedTask
    }

    public identifyTransition(transition: TransitionDerivativeIdentity, semanticId: string): IdentifiedTransition {
        const identifiedTransition = IdentifiedTransition.identify(transition, semanticId)
        this._identifiedTransitionsById.set(semanticId, identifiedTransition)
        return identifiedTransition
    }

    public getIdentifiedTasks(): Iterable<Identified<ast.Task>> {
        return this._identifiedTasksById.values()
    }

    public getIdentifiedTransitions(): Iterable<IdentifiedTransition> {
        return this._identifiedTransitionsById.values()
    }

    public getPreviousIdentifiedTask(id: string): Identified<ast.Task> | undefined {
        return this._previousIdentifiedTaskById?.get(id)
    }

    public getPreviousIdentifiedTransition(id: string): IdentifiedTransition | undefined {
        return this._previousIdentifiedTransitionsById?.get(id)
    }

    public clear() {
        this.invalidTasks.clear()
        this.invalidReferences.clear()
        this._previousIdentifiedTaskById = this._identifiedTasksById
        this._identifiedTasksById = new Map()
        this._previousIdentifiedTransitionsById = this._identifiedTransitionsById
        this._identifiedTransitionsById = new Map()
    }

    public setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        this.invalidTasks = invalidTasks
    }

    public setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void {
        this.invalidReferences.set(task, invalidReferences)
    }

}

class PreprocessedTaskListSemanticDomain extends DefaultTaskListSemanticDomain {

    private _validTasksByModel = new Map<ast.Model, Array<Valid<ast.Task>>>()
    private _validTargetTasksBySourceTask = new Map<Valid<ast.Task>, Array<Valid<ast.Task>>>()
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
