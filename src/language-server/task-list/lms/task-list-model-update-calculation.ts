import * as id from '../../../langium-model-server/identity/model'
import type { ReadonlyArrayUpdate } from '../../../langium-model-server/lms/model'
import { ArrayUpdate, ArrayUpdateCommand, ElementUpdate, RootUpdate, Update } from '../../../langium-model-server/lms/model'
import { AbstractModelUpdateCalculators, deleteModels, type ModelUpdateCalculator } from '../../../langium-model-server/lms/model-update-calculation'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import * as ast from '../../generated/ast'
import type * as identity from '../identity/model'
import type * as semantic from '../semantic/model'
import type { QueriableTaskListSemanticDomain } from '../semantic/task-list-semantic-domain'
import type { TaskListDocument } from '../workspace/documents'
import type { Model } from './model'
import { Task, Transition } from './model'

export class TaskListModelUpdateCalculators extends AbstractModelUpdateCalculators<Model> {

    public override getOrCreateCalculator(lmsDocument: Initialized<TaskListDocument>): TaskListModelUpdateCalculator {
        return super.getOrCreateCalculator(lmsDocument) as TaskListModelUpdateCalculator
    }

    protected override createCalculator(langiumDocument: Initialized<TaskListDocument>): TaskListModelUpdateCalculator {
        return new TaskListModelUpdateCalculator(langiumDocument.semanticDomain)
    }

}

export class TaskListModelUpdateCalculator implements ModelUpdateCalculator<Model> {

    protected semanticDomain: QueriableTaskListSemanticDomain

    public constructor(taskListSemanticDomain: QueriableTaskListSemanticDomain) {
        this.semanticDomain = taskListSemanticDomain
    }

    private readonly _tasksMarkedForDeletion: Map<string, sem.Identified<ast.Task> | identity.TaskIdentity> = new Map()
    private readonly _transitionsMarkedForDeletion: Map<string, sem.Identified<semantic.Transition> | identity.TransitionIdentity> = new Map()

    public calculateTasksUpdate(identitiesToDelete: Iterable<identity.TaskIdentity>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.identifiedTasks.values()
        const updates = Array.from(existingTasks, task => this.compareTaskWithExistingBefore(task))
        const deletion: ReadonlyArrayUpdate<Task> = deleteModels(
            this._tasksMarkedForDeletion,
            identitiesToDelete,
            this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain),
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public calculateTransitionsUpdate(identitiesToDelete: Iterable<identity.TransitionIdentity>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.identifiedTransitions.values()
        const updates = Array.from(existingTransitions, transition => this.compareTransitionWithExistingBefore(transition))
        const deletion: ReadonlyArrayUpdate<Transition> = deleteModels(
            this._transitionsMarkedForDeletion,
            identitiesToDelete,
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public clearModelsMarkedForDeletion(): RootUpdate<Model> {
        const tasksDeletion = ArrayUpdateCommand.deletion<Task>(this._tasksMarkedForDeletion.values())
        this._tasksMarkedForDeletion.clear()
        const transitionsDeletion = ArrayUpdateCommand.deletion<Transition>(this._transitionsMarkedForDeletion.values())
        this._transitionsMarkedForDeletion.clear()

        const rootUpdate = RootUpdate.createEmpty<Model>(this.semanticDomain.rootId, id.ModelUri.root)
        if (!ArrayUpdate.isEmpty(tasksDeletion)) rootUpdate.tasks = ArrayUpdate.create(tasksDeletion)
        if (!ArrayUpdate.isEmpty(transitionsDeletion)) rootUpdate.transitions = ArrayUpdate.create(transitionsDeletion)
        return rootUpdate
    }

    private compareTaskWithExistingBefore(current: sem.Identified<ast.Task>): ReadonlyArrayUpdate<Task> {
        const semanticId = current.id
        const previous = this.semanticDomain.getPreviousIdentifiedTask(semanticId)
        const previousDeletedFromAst = this._tasksMarkedForDeletion.get(semanticId)
        this._tasksMarkedForDeletion.delete(semanticId)
        if (!previous) {
            if (!previousDeletedFromAst) {
                return ArrayUpdateCommand.addition(Task.create(current))
            }// Existed in AST long before, was marked for deletion, now reappearing: comparing to be on a safe side
            const reappearance: ElementUpdate<Task> = ElementUpdate.createStateUpdate(semanticId, 'REAPPEARED')
            if (ast.isTask(previousDeletedFromAst)) {
                // Can reappear different now (e.g., if copypasted from external source)
                Update.assignIfUpdated(reappearance, 'content', previousDeletedFromAst.content, current.content, '')
            } else { // RECHECK: A VERY edge case: when an element was marked for deletion, there was no previous Semantic Model for it. Is it at all possible?...
                Update.assign(reappearance, 'content', current.content, '')
            }
            return ArrayUpdateCommand.modification(reappearance)
        } // Existed in AST before
        const update = ElementUpdate.createEmpty<Task>(semanticId)
        // Not comparing the task.name, since it cannot be changed (existed in previous AST)
        // (it plays a role in task Identity, hence with its change it is a different task)
        Update.assignIfUpdated(update, 'content', previous.content, current.content, '')
        if (previousDeletedFromAst) {// Why it was marked for deletion if it existed in the AST before?
            console.warn(`Task '${semanticId}' with name=${current.name} existed in previous AST, but was marked for deletion.`)
            update.__state = 'REAPPEARED'
        }
        return ArrayUpdateCommand.modification(update)
    }

    private compareTransitionWithExistingBefore(current: sem.Identified<semantic.Transition>): ReadonlyArrayUpdate<Transition> {
        const semanticId = current.id
        const previous = this.semanticDomain.getPreviousIdentifiedTransition(semanticId)
        const previousDeletedFromAst = this._transitionsMarkedForDeletion.get(semanticId)
        this._transitionsMarkedForDeletion.delete(semanticId)
        if (!previous) {
            if (!previousDeletedFromAst) {
                return ArrayUpdateCommand.addition(Transition.create(current))
            }// Existed in AST long before, was marked for deletion, now reappearing: won't compare, since no modifiable attributes
            return ArrayUpdateCommand.modification(ElementUpdate.createStateUpdate<Transition>(semanticId, 'REAPPEARED'))
        }
        // Since source model for Transition doesn't have any modifiable attribute, it will only return Addition Update
        return ArrayUpdateCommand.noUpdate()
    }

}
