import { stream } from 'langium'
import type * as id from '../../../langium-model-server/semantic/identity'
import type * as sem from '../../../langium-model-server/semantic/model'
import { Update } from '../../../langium-model-server/lms/model'
import type { ReadonlyArrayUpdate } from '../../../langium-model-server/lms/model'
import { ArrayUpdateCommand } from '../../../langium-model-server/lms/model'
import type { ModelUpdateCalculator } from '../../../langium-model-server/lms/model-update-calculation'
import * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'
import type * as identity from '../semantic/task-list-identity'
import type { QueriableTaskListSemanticDomain } from '../semantic/task-list-semantic-domain'
import type { Model } from './model'
import { Task, Transition } from './model'
import { ElementUpdate } from '../../../langium-model-server/lms/model'

export class TaskListModelUpdateCalculator implements ModelUpdateCalculator<Model> {

    protected semanticDomain: QueriableTaskListSemanticDomain

    public constructor(taskListSemanticDomain: QueriableTaskListSemanticDomain) {
        this.semanticDomain = taskListSemanticDomain
    }

    private readonly _tasksMarkedForDeletion: Map<string, sem.Identified<ast.Task> | identity.Task> = new Map()
    private readonly _transitionsMarkedForDeletion: Map<string, sem.Identified<semantic.Transition> | identity.Transition> = new Map()

    public calculateTasksUpdate(identitiesToDelete: Iterable<identity.Task>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.getIdentifiedTasks()
        const updates = Array.from(existingTasks, task => this.compareTaskWithExistingBefore(task))
        const deletion: ReadonlyArrayUpdate<Task> = deleteModels(
            this._tasksMarkedForDeletion,
            identitiesToDelete,
            this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain),
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public calculateTransitionsUpdate(identitiesToDelete: Iterable<identity.Transition>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.getIdentifiedTransitions()
        const updates = Array.from(existingTransitions, transition => this.compareTransitionWithExistingBefore(transition))
        const deletion: ReadonlyArrayUpdate<Transition> = deleteModels(
            this._transitionsMarkedForDeletion,
            identitiesToDelete,
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
        )

        return ArrayUpdateCommand.all(...updates, deletion)
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

// TODO: Move to parent abstract class
/**
 * Computes {@link ReadonlyArrayUpdate} for {@link identitiesToDelete} by comparing them with {@link modelsMarkedForDeletion}.
 *
 * ❗This function should be invoked only after all other updates are prepared, so that **reappeared nodes are unmarked for deletion**
 * @param modelsMarkedForDeletion Current registry of Semantic Models (or Semantic Identity in rare cases
 * when semantic models are unavailable), that were deleted from the AST, but not yet deleted from Semantic Identity model.
 * @param identitiesToDelete Semantic Identities to be deleted (or soft deleted); they are absent already in AST
 * (and thus in current Semantic Model), but are expected to be present in previous Semantic Model
 * fetched by {@link getPreviousSemanticModel}.
 * @param getPreviousSemanticModel Fetches corresponding previous Semantic Model from SemanticDomain
 * @returns Semantic Model Update for this deletion request
 */
function deleteModels<ID extends id.SemanticIdentity, SEM extends id.SemanticIdentity, SRC extends id.SemanticIdentity>(
    modelsMarkedForDeletion: Map<string, ID | SEM>,
    identitiesToDelete: Iterable<ID>,
    getPreviousSemanticModel: (id: string) => SEM | undefined
): ReadonlyArrayUpdate<SRC> {
    let deletion: ReadonlyArrayUpdate<SRC> | undefined = undefined
    let identitiesToBeMarkedForDeletion = stream(identitiesToDelete)
    if (modelsMarkedForDeletion.size !== 0) {
        deletion = ArrayUpdateCommand.deletion<SRC>(modelsMarkedForDeletion.values())
        const deletedModelIds = new Set(modelsMarkedForDeletion.keys())
        modelsMarkedForDeletion.clear()
        identitiesToBeMarkedForDeletion = identitiesToBeMarkedForDeletion.filter(({ id }) => !deletedModelIds.has(id))
    }
    identitiesToBeMarkedForDeletion.forEach(identity => {
        // When we receive Semantic Identity of the model to be deleted, we first try to use
        // _Semantic Model_ with such semantic ID (which could exist in _previous_ AST state),
        // since Semantic Model stores all attributes and we will be able to do more precise comparison
        // if it reappears later
        modelsMarkedForDeletion.set(identity.id, getPreviousSemanticModel(identity.id) ?? identity)
    })
    const dissappearances = ArrayUpdateCommand.modification(
        Array.from(modelsMarkedForDeletion.keys(), id => ElementUpdate.createStateUpdate<SRC>(id, 'DISAPPEARED')))
    return deletion ? ArrayUpdateCommand.all(deletion, dissappearances) : dissappearances
}
