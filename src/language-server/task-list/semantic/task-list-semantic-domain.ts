import type { AstNode, Properties, Stream } from 'langium'
import { stream } from 'langium'
import type { ArtificialAstNode } from '../../../langium-model-server/semantic/model'
import { Validated } from '../../../langium-model-server/semantic/model'
import { Identified } from '../../../langium-model-server/semantic/model'
import type { QueriableSemanticDomain, SemanticDomain } from '../../../langium-model-server/semantic/semantic-domain'
import * as ast from '../../generated/ast'
import type * as id from '../identity/model'
import type { IdentifiedTask, IdentifiedTransition } from './model'
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
    validateTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void
    validateReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void
    // NOTE: 👇 This is considered as part of manipulation with AST Nodes
    getValidatedTasks(model: ast.Model): Stream<Validated<ast.Task>>
    // "Mixed" operation: is called after tasks are already identified, but serve for Transition identification
    getValidatedTransitions(): Stream<Transition>
    // NOTE: 👇 This is considered as part of manipulation with Semantic Model (IdentifiedTask and IdentifiedTransition)
    /**
     * Maps Validated Task node with semantic identity.
     * @param task Validated AST Task node
     * @param identity Semantic identity, which {@link task} is identified with
    */
    identifyTask(task: Validated<ast.Task>, identity: id.TaskIdentity): IdentifiedTask
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

    protected invalidReferences: Map<ast.Task, Set<number>>

    private _identifiedTasksById: Map<string, IdentifiedTask>
    private _previousIdentifiedTaskById: Map<string, IdentifiedTask> | undefined
    private _validTransitionsByIdentifiedTask: Map<IdentifiedTask, Transition[]>
    private _identifiedTransitionsById: Map<string, IdentifiedTransition>
    private _previousIdentifiedTransitionsById: Map<string, IdentifiedTransition> | undefined

    constructor(rootId: string) {
        this.rootId = rootId
        this.invalidReferences = new Map()
        this._identifiedTasksById = new Map()
        this._validTransitionsByIdentifiedTask = new Map()
        this._identifiedTransitionsById = new Map()
    }

    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidatedTasks, getValidatedTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor IdentityIndex is responsible for traversing AST internals
    */

    protected isTaskReferenceValidated(
        task: Validated<ast.Task>,
        referenceIndex: number
    ): boolean {
        return !this.invalidReferences.get(task)?.has(referenceIndex)
    }

    // NOTE: Rather defensive function, to ensure synthetic Transition domain objects uniqueness (per AST Task.reference)
    protected getValidatedTransitionsForSourceTask(sourceTask: IdentifiedTask): Transition[] {
        let validTransitions = this._validTransitionsByIdentifiedTask.get(sourceTask)
        if (!validTransitions) {
            validTransitions = Transition.create(sourceTask, this.isTaskReferenceValidated.bind(this))
            this._validTransitionsByIdentifiedTask.set(sourceTask, validTransitions)
        }
        return validTransitions
    }

    public getValidatedTasks(model: ast.Model): Stream<Validated<ast.Task>> {
        return stream(model.tasks)
            .filter(Validated.is)
    }

    public getValidatedTransitions(): Stream<Transition> {
        return stream(this.identifiedTasks.values())
            .flatMap(this.getValidatedTransitionsForSourceTask.bind(this))
    }

    public identifyTask(task: Validated<ast.Task>, identity: id.TaskIdentity): IdentifiedTask {
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
        this.invalidReferences.clear()
        this._validTransitionsByIdentifiedTask.clear()
        this._previousIdentifiedTaskById = this._identifiedTasksById
        this._identifiedTasksById = new Map()
        this._previousIdentifiedTransitionsById = this._identifiedTransitionsById
        this._identifiedTransitionsById = new Map()
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public getValidatedNode<N extends AstNode, P = Properties<N>>(node: N, property?: P, index?: number): Validated<AstNode | ArtificialAstNode> | undefined {
        if (ast.isTask(node) && Validated.is(node)) {
            return node
        }
        return undefined
    }

    public getIdentifiedNode(id: string): Identified<AstNode | ArtificialAstNode> | undefined {
        return this._identifiedTasksById.get(id) || this._identifiedTransitionsById.get(id)
    }

    public validateTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        model.tasks.filter(task => !invalidTasks.has(task))
            .forEach(Validated.validate)
    }

    public validateReferencesForTask(task: ast.Task, invalidReferences: Set<number>): void {
        this.invalidReferences.set(task, invalidReferences)
    }

}
