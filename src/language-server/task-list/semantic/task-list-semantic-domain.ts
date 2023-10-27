import type { AstNode, Stream } from 'langium'
import { stream } from 'langium'
import type { IdentifiedNode } from '../../../langium-model-server/semantic/model'
import { Identified, Validated, ValidatedReference } from '../../../langium-model-server/semantic/model'
import { type QueriableSemanticDomain, type SemanticDomain } from '../../../langium-model-server/semantic/semantic-domain'
import { TypeGuard } from '../../../langium-model-server/utils/types'
import type * as ast from '../../generated/ast'
import type * as id from '../identity/model'
import type { IdentifiedTask, IdentifiedTransition, TransitionIdentifiedProperties } from './model'
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
    validateTransitionsForTask(task: ast.Task, invalidReferences: Set<ast.Transition>): void
    // NOTE: 👇 This is considered as part of manipulation with AST Nodes
    getValidatedTasks(model: ast.Model): Stream<Validated<ast.Task>>
    getValidatedTransitions(): Stream<Validated<Transition & TransitionIdentifiedProperties>>
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
    identifyTransition(transition: Validated<Transition>, identity: id.TransitionIdentity): IdentifiedTransition
}

export namespace TaskListSemanticDomain {

    export function create(rootId: string) {
        return new DefaultTaskListSemanticDomain(rootId)
    }
}

class DefaultTaskListSemanticDomain implements TaskListSemanticDomain {

    public readonly rootId: string

    private _validatedTransitionsByTask: Map<Validated<ast.Task>, Array<Validated<Transition>>>
    private _identifiedTasksById: Map<string, IdentifiedTask>
    private _previousIdentifiedTaskById: Map<string, IdentifiedTask> | undefined
    private _identifiedTransitionsById: Map<string, IdentifiedTransition>
    private _previousIdentifiedTransitionsById: Map<string, IdentifiedTransition> | undefined

    constructor(rootId: string) {
        this.rootId = rootId
        this._identifiedTasksById = new Map()
        this._validatedTransitionsByTask = new Map()
        this._identifiedTransitionsById = new Map()
    }

    /* NOTE: SemanticDomain is responsible for semantic model-specific domain logic:

        - Task is valid for Semantic Model (is unique by name within a document)
        - Transition is valid for Semantic Model (is unique by name within a Task).
        - Aggregate functions: getValidatedTasks, getValidatedTargetTasks, which deals with Model/Task internals

        So that neither SemanticManager, nor IdentityIndex is responsible for traversing AST internals
    */

    public validateTasksForModel(model: ast.Model, invalidTasks: Set<ast.Task>): void {
        model.tasks
            .filter(task => !invalidTasks.has(task))
            .forEach(Validated.validate)
    }

    public validateTransitionsForTask(task: ast.Task, invalidTransitions: Set<ast.Transition>): void {
        if (Validated.is(task)) {
            const validatedTransitions = stream(task.transitions)
                .filter(transition => !invalidTransitions.has(transition))
                .filter(TypeGuard.withProp('targetTaskRef', ValidatedReference.is<ast.Task>))
                .map(Transition.initProperties)
                .map(Validated.validate)
                .toArray()
            this._validatedTransitionsByTask.set(task, validatedTransitions)
        }
    }

    public getValidatedTasks(model: ast.Model): Stream<Validated<ast.Task>> {
        return stream(model.tasks)
            .filter(Validated.is)
    }

    public getValidatedTransitions(): Stream<Validated<Transition & TransitionIdentifiedProperties>> {
        return stream(...this._validatedTransitionsByTask.values())
            .filter(Transition.assertIdentifiedProperties)
    }

    public identifyTask(task: Validated<ast.Task>, identity: id.TaskIdentity): IdentifiedTask {
        const identifiedTask = Identified.identify(task, identity)
        this._identifiedTasksById.set(identifiedTask.$identity.id, identifiedTask)
        return identifiedTask
    }

    public identifyTransition(transition: Validated<Transition & TransitionIdentifiedProperties>, identity: id.TransitionIdentity): IdentifiedTransition {
        const identifiedTransition = Identified.identify(transition, identity)
        this._identifiedTransitionsById.set(identifiedTransition.$identity.id, identifiedTransition)
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
        this._validatedTransitionsByTask.clear()
        this._previousIdentifiedTaskById = this._identifiedTasksById
        this._identifiedTasksById = new Map()
        this._previousIdentifiedTransitionsById = this._identifiedTransitionsById
        this._identifiedTransitionsById = new Map()
    }

    public getIdentifiedNodes(): Stream<IdentifiedNode> {
        return stream(this._identifiedTasksById.values())
            .concat(this._identifiedTransitionsById.values())
    }

    public getIdentifiedNode(id: string): Identified<AstNode> | undefined {
        return this._identifiedTasksById.get(id) || this._identifiedTransitionsById.get(id)
    }

}
