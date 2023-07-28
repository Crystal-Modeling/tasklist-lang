import type { AstNode, Stream } from 'langium'
import { stream } from 'langium'
import type { ArtificialAstNode, Valid } from '../../../langium-model-server/semantic/model'
import { Identified } from '../../../langium-model-server/semantic/model'
import type { SemanticDomain } from '../../../langium-model-server/semantic/semantic-domain'
import type * as ast from '../../generated/ast'
import { Transition } from './model'

export interface QueriableTaskListSemanticDomain {
    getIdentifiedTasks(): Iterable<Identified<ast.Task>>
    getIdentifiedTransitions(): Iterable<Identified<Transition>>
    getPreviousIdentifiedTask(id: string): Identified<ast.Task> | undefined
    getPreviousIdentifiedTransition(id: string): Identified<Transition> | undefined
}
export interface TaskListSemanticDomain extends QueriableTaskListSemanticDomain, SemanticDomain {
    clear(): void
    // NOTE: 👇 These are initialized during Validation phase to define elements, semantically valid WITHIN THIS DOCUMENT
    setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    // NOTE: 👇 This is considered as part of manipulation with AST Nodes
    getValidTasks(model: ast.Model): Stream<Valid<ast.Task>>
    // "Mixed" operation: is called after tasks are already identified, but serve for Transition identification
    getValidTransitions(): Stream<Transition>
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
    identifyTransition(transition: Transition, semanticId: string): Identified<Transition>
}

export namespace TaskListSemanticDomain {

    export function create() {
        return new DefaultTaskListSemanticDomain()
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    protected invalidTasks: Set<ast.Task>
    protected invalidReferences: Map<ast.Task, Set<number>>

    private _identifiedTasksById: Map<string, Identified<ast.Task>>
    private _previousIdentifiedTaskById: Map<string, Identified<ast.Task>> | undefined
    private _validTransitionsByIdentifiedTask: Map<Identified<ast.Task>, Transition[]>
    private _identifiedTransitionsById: Map<string, Identified<Transition>>
    private _previousIdentifiedTransitionsById: Map<string, Identified<Transition>> | undefined

    constructor() {
        this.invalidTasks = new Set()
        this.invalidReferences = new Map()
        this._identifiedTasksById = new Map()
        this._validTransitionsByIdentifiedTask = new Map()
        this._identifiedTransitionsById = new Map()
    }

    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidTasks, getValidTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor IdentityIndex is responsible for traversing AST internals
    */
    protected isTaskValid(task: ast.Task): task is Valid<ast.Task> {
        return !this.invalidTasks.has(task)
    }

    protected isTaskReferenceValid(
        task: Valid<ast.Task>,
        referenceIndex: number
    ): boolean {
        return !this.invalidReferences.get(task)?.has(referenceIndex)
    }

    // NOTE: Rather defensive function, to ensure synthetic Transition domain objects uniqueness (per AST Task.reference)
    protected getValidTransitionsForSourceTask(sourceTask: Identified<ast.Task>): Transition[] {
        let validTransitions = this._validTransitionsByIdentifiedTask.get(sourceTask)
        if (!validTransitions) {
            validTransitions = Transition.create(sourceTask, this.isTaskReferenceValid.bind(this))
            this._validTransitionsByIdentifiedTask.set(sourceTask, validTransitions)
        }
        return validTransitions
    }

    public getValidTasks(model: ast.Model): Stream<Valid<ast.Task>> {
        return stream(model.tasks)
            .filter(this.isTaskValid.bind(this))
    }

    public getValidTransitions(): Stream<Transition> {
        return stream(this.getIdentifiedTasks())
            .flatMap(this.getValidTransitionsForSourceTask.bind(this))
    }

    public identifyTask(task: Valid<ast.Task>, semanticId: string): Identified<ast.Task> {
        const identifiedTask = Identified.identify(task, semanticId)
        this._identifiedTasksById.set(semanticId, identifiedTask)
        return identifiedTask
    }

    public identifyTransition(transition: Transition, semanticId: string): Identified<Transition> {
        const identifiedTransition = Identified.identify(transition, semanticId)
        this._identifiedTransitionsById.set(semanticId, identifiedTransition)
        return identifiedTransition
    }

    public getIdentifiedTasks(): Iterable<Identified<ast.Task>> {
        return this._identifiedTasksById.values()
    }

    public getIdentifiedTransitions(): Iterable<Identified<Transition>> {
        return this._identifiedTransitionsById.values()
    }

    public getPreviousIdentifiedTask(id: string): Identified<ast.Task> | undefined {
        return this._previousIdentifiedTaskById?.get(id)
    }

    public getPreviousIdentifiedTransition(id: string): Identified<Transition> | undefined {
        return this._previousIdentifiedTransitionsById?.get(id)
    }

    public clear() {
        this.invalidTasks.clear()
        this.invalidReferences.clear()
        this._validTransitionsByIdentifiedTask.clear()
        this._previousIdentifiedTaskById = this._identifiedTasksById
        this._identifiedTasksById = new Map()
        this._previousIdentifiedTransitionsById = this._identifiedTransitionsById
        this._identifiedTransitionsById = new Map()
    }

    public getIdentifiedNode(id: string): Identified<AstNode | ArtificialAstNode> | undefined {
        return this._identifiedTasksById.get(id) || this._identifiedTransitionsById.get(id)
    }

    public setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        this.invalidTasks = invalidTasks
    }

    public setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void {
        this.invalidReferences.set(task, invalidReferences)
    }

}
