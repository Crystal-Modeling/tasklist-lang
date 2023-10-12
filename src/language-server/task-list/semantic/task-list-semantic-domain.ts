import type { AstNode, Stream } from 'langium'
import { stream } from 'langium'
import type { ArtificialAstNode, Valid } from '../../../langium-model-server/semantic/model'
import { Identified } from '../../../langium-model-server/semantic/model'
import type { QueriableSemanticDomain, SemanticDomain } from '../../../langium-model-server/semantic/semantic-domain'
import type * as ast from '../../generated/ast'
import type * as id from '../identity/model'
import type { IdentifiedTask, IdentifiedTransition} from './model'
import { Transition } from './model'

export interface QueriableTaskListSemanticDomain extends QueriableSemanticDomain {
    readonly identifiedTasks: ReadonlyMap<string, IdentifiedTask>
    readonly identifiedTransitions: ReadonlyMap<string, IdentifiedTransition>
    getPreviousIdentifiedTask(id: string): IdentifiedTask | undefined
    getPreviousIdentifiedTransition(id: string): IdentifiedTransition | undefined
}
export interface TaskListSemanticDomain extends SemanticDomain, QueriableTaskListSemanticDomain {
    clear(): void
    // NOTE: 👇 These are initialized during Validation phase to define elements, semantically valid WITHIN THIS DOCUMENT
    setInvalidTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    setInvalidReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    // NOTE: 👇 This is considered as part of manipulation with AST Nodes
    getValidTasks(model: ast.Model): Stream<Valid<ast.Task>>
    // "Mixed" operation: is called after tasks are already identified, but serve for Transition identification
    getValidTransitions(): Stream<Transition>
    // NOTE: 👇 This is considered as part of manipulation with Semantic Model (IdentifiedTask and IdentifiedTransition)
    /**
     * Maps Valid Task node with semantic identity.
     * @param task Valid AST Task node
     * @param identity Semantic identity, which {@link task} is identified with
    */
    identifyTask(task: Valid<ast.Task>, identity: id.TaskIdentity): IdentifiedTask
    /**
     * Maps Transition *artificial* node with semantic identity
     * @param transition Artificial Transition node (they are created being already validated)
     * @param identity Semantic identity, which {@link transition} is identified with
     */
    identifyTransition(transition: Transition, identity: id.TransitionIdentity): IdentifiedTransition
}

export namespace TaskListSemanticDomain {

    export function create(rootId: string) {
        return new DefaultTaskListSemanticDomain(rootId)
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    public readonly rootId: string

    protected invalidTasks: Set<ast.Task>
    protected invalidReferences: Map<ast.Task, Set<number>>

    private _identifiedTasksById: Map<string, IdentifiedTask>
    private _previousIdentifiedTaskById: Map<string, IdentifiedTask> | undefined
    private _validTransitionsByIdentifiedTask: Map<IdentifiedTask, Transition[]>
    private _identifiedTransitionsById: Map<string, IdentifiedTransition>
    private _previousIdentifiedTransitionsById: Map<string, IdentifiedTransition> | undefined

    constructor(rootId: string) {
        this.rootId = rootId
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
    protected getValidTransitionsForSourceTask(sourceTask: IdentifiedTask): Transition[] {
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
        return stream(this.identifiedTasks.values())
            .flatMap(this.getValidTransitionsForSourceTask.bind(this))
    }

    public identifyTask(task: Valid<ast.Task>, identity: id.TaskIdentity): IdentifiedTask {
        const identifiedTask = Identified.identify(task, identity)
        this._identifiedTasksById.set(identifiedTask.id, identifiedTask)
        return identifiedTask
    }

    public identifyTransition(transition: Transition, identity: id.TransitionIdentity): IdentifiedTransition {
        const identifiedTransition = Identified.identify(transition, identity)
        this._identifiedTransitionsById.set(identifiedTransition.id, identifiedTransition)
        return identifiedTransition
    }

    public get identifiedTasks(): ReadonlyMap<string, IdentifiedTask> {
        return this._identifiedTasksById
    }

    public get identifiedTransitions(): ReadonlyMap<string, IdentifiedTransition> {
        return this._identifiedTransitionsById
    }

    public getPreviousIdentifiedTask(id: string): IdentifiedTask | undefined {
        return this._previousIdentifiedTaskById?.get(id)
    }

    public getPreviousIdentifiedTransition(id: string): IdentifiedTransition | undefined {
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
