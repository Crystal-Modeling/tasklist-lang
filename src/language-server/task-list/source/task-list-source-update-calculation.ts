import type * as id from '../../../langium-model-server/semantic/identity'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { ReadonlyArrayUpdate, Update } from '../../../langium-model-server/source/model'
import { ArrayUpdateCommand } from '../../../langium-model-server/source/model'
import type { SourceUpdateCalculator } from '../../../langium-model-server/source/source-update-calculation'
import * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'
import type * as identity from '../semantic/task-list-identity'
import type { QueriableTaskListSemanticDomain } from '../semantic/task-list-semantic-domain'
import type { Model } from './model'
import { Task, Transition } from './model'

export class TaskListSourceModelUpdateCalculator implements SourceUpdateCalculator<Model> {

    protected semanticDomain: QueriableTaskListSemanticDomain

    public constructor(taskListSemanticDomain: QueriableTaskListSemanticDomain) {
        this.semanticDomain = taskListSemanticDomain
    }

    private readonly _tasksMarkedForDeletion: Map<string, sem.Identified<ast.Task> | identity.Task> = new Map()
    private readonly _transitionsMarkedForDeletion: Map<string, semantic.IdentifiedTransition | identity.Transition> = new Map()

    public calculateTasksUpdate(identitiesToDelete: Iterable<identity.Task>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.getIdentifiedTasks()
        const updates = Array.from(existingTasks, task => this.compareTaskWithExistingBefore(task))
        const deletion: ReadonlyArrayUpdate<Task> = this.deleteModels(this._tasksMarkedForDeletion,
            identitiesToDelete, this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain))

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public calculateTransitionsUpdate(identitiesToDelete: Iterable<identity.Transition>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.getIdentifiedTransitions()
        const updates = Array.from(existingTransitions, transition => this.compareTransitionWithExistingBefore(transition))
        const deletion: ReadonlyArrayUpdate<Transition> = this.deleteModels(this._transitionsMarkedForDeletion,
            identitiesToDelete, this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain))

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
            const update: Update<Task> = { id: semanticId }
            if (ast.isTask(previousDeletedFromAst)) {
                // Can reappear different now (e.g., if copypasted from external source)
                if (previousDeletedFromAst.content !== current.content) update.content = current.content
            } else { // RECHECK: A VERY edge case: when an element was marked for deletion, there was no previous Semantic Model for it. Is it at all possible?...
                update.content = current.content
            }
            return ArrayUpdateCommand.modification(update)
        } // Existed in AST before
        const update: Update<Task> = { id: semanticId }
        // Not comparing the task.name, since it cannot be changed (existed in previous AST)
        // (it plays a role in task Identity, hence with its change it is a different task)
        if (previous.content !== current.content) update.content = current.content
        if (previousDeletedFromAst) {// Why it was marked for deletion if it existed in the AST before?
            console.warn(`Task '${semanticId}' with name=${current.name} existed in previous AST, but was marked for deletion.`)
            // TODO: reflect its appearance (though weird) in semantic model
        }
        return ArrayUpdateCommand.modification(update)
    }

    private compareTransitionWithExistingBefore(current: semantic.IdentifiedTransition): ReadonlyArrayUpdate<Transition> {
        const semanticId = current.id
        const previous = this.semanticDomain.getPreviousIdentifiedTransition(semanticId)
        const previousDeletedFromAst = this._transitionsMarkedForDeletion.get(semanticId)
        this._transitionsMarkedForDeletion.delete(semanticId)
        if (!previous) {
            if (!previousDeletedFromAst) {
                return ArrayUpdateCommand.addition(Transition.create(current))
            }// Existed in AST long before, was marked for deletion, now reappearing: won't compare, since no modifiable attributes
            // TODO: Mark its appearance instead of noUpdate
            return ArrayUpdateCommand.noUpdate()
        }
        // Since source model for Transition doesn't have any modifiable attribute, it will only return Addition Update
        return ArrayUpdateCommand.noUpdate()
    }

    /**
     * Computes {@link ReadonlyArrayUpdate} for {@link modelsToDelete} by comparing them with {@link modelsMarkedForDeletion}.
     *
     * ❗This function should be invoked only after all other updates are prepared, so that **reappeared nodes are unmarked for deletion**
     * @param modelsMarkedForDeletion Current registry of Semantic Models (or Semantic Identity in rare cases
     * when semantic models are unavailable), that were deleted from the AST, but not yet deleted from Semantic Identity model.
     * @param modelsToDelete Semantic Identities to be deleted (or soft deleted); they are absent already in AST
     * (and thus in current Semantic Model), but are expected to be present in previous Semantic Model
     * fetched by {@link getPreviousSemanticModel}.
     * @param getPreviousSemanticModel Fetches corresponding previous Semantic Model from SemanticDomain
     * @returns Semantic Model Update for this deletion request
     */
    private deleteModels<ID extends id.SemanticIdentity, SEM extends id.SemanticIdentity, SRC extends id.SemanticIdentity>(
        modelsMarkedForDeletion: Map<string, ID | SEM>,
        modelsToDelete: Iterable<ID>,
        getPreviousSemanticModel: (id: string) => SEM | undefined
    ): ReadonlyArrayUpdate<SRC> {
        console.debug('******** Existing models marked for deletion', modelsMarkedForDeletion.values())
        if (modelsMarkedForDeletion.size !== 0) {
            const deletion = ArrayUpdateCommand.deletion<SRC>(modelsMarkedForDeletion.values())
            const deletedModels = new Set(modelsMarkedForDeletion.keys())
            modelsMarkedForDeletion.clear()
            for (const model of modelsToDelete) {
                if (!deletedModels.has(model.id)) {
                    // When we receive Semantic ID of the model to be deleted, we first check,
                    // if _Semantic Model_ with such ID existed before, since Semantic Model stores all attributes
                    modelsMarkedForDeletion.set(model.id, getPreviousSemanticModel(model.id) ?? model)
                }
            }
            console.debug('Marked models for deletion', modelsMarkedForDeletion.values())
            // TODO: Instead of no update, return modification, indicating, that elements are about to be deleted
            return ArrayUpdateCommand.all(deletion, ArrayUpdateCommand.noUpdate())
        }
        for (const model of modelsToDelete) {
            // When we receive Semantic ID of the model to be deleted, we first check,
            // if _Semantic Model_ with such ID existed before, since Semantic Model stores all attributes
            modelsMarkedForDeletion.set(model.id, getPreviousSemanticModel(model.id) ?? model)
        }
        console.debug('Marked models for deletion (No actual deletion)', modelsMarkedForDeletion.values())
        return ArrayUpdateCommand.noUpdate()
    }
}
