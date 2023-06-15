import type * as id from '../../../langium-model-server/semantic/identity'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { ReadonlyArrayUpdate, Update } from '../../../langium-model-server/source/model'
import { ArrayUpdateCommand } from '../../../langium-model-server/source/model'
import type { SourceUpdateCalculator } from '../../../langium-model-server/source/source-update-calculation'
import type * as ast from '../../generated/ast'
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

    private readonly _tasksMarkedForDeletion: Map<string, identity.Task> = new Map()
    private readonly _transitionsMarkedForDeletion: Map<string, identity.Transition> = new Map()

    public calculateTasksUpdate(identitiesToDelete: Iterable<identity.Task>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.getIdentifiedTasks()
        const updates = Array.from(existingTasks, task => this.compareTaskWithPrevious(task))

        return ArrayUpdateCommand.all(...updates, this.deleteModels(existingTasks, this._tasksMarkedForDeletion, identitiesToDelete))
    }

    public calculateTransitionsUpdate(identitiesToDelete: Iterable<identity.Transition>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.getIdentifiedTransitions()
        const updates = Array.from(existingTransitions, transition => this.compareTransitionWithPrevious(transition))

        return ArrayUpdateCommand.all(...updates, this.deleteModels(existingTransitions, this._transitionsMarkedForDeletion, identitiesToDelete))
    }

    private compareTaskWithPrevious(current: sem.Identified<ast.Task>): ReadonlyArrayUpdate<Task> {
        const semanticId = current.id
        const previous = this.semanticDomain.getPreviousIdentifiedTask(semanticId)
        if (!previous) {
            return ArrayUpdateCommand.addition(Task.create(current))
        }
        const update: Update<Task> = { id: semanticId }
        // Not comparing the task.name, since it cannot be changed
        // (it plays a role in task Identity, hence with its change it is a different task)
        if (previous.content !== current.content) {
            update.content = current.content
        }
        return ArrayUpdateCommand.modification(update)
    }

    private compareTransitionWithPrevious(current: semantic.IdentifiedTransition): ReadonlyArrayUpdate<Transition> {
        const semanticId = current.id
        const previous = this.semanticDomain.getPreviousIdentifiedTransition(semanticId)
        if (!previous) {
            return ArrayUpdateCommand.addition(Transition.create(current))
        }
        // Since source model for Transition doesn't have any modifiable attribute, it will only return Addition Update
        return ArrayUpdateCommand.noUpdate()
    }

    private deleteModels<ID extends id.SemanticIdentity, S extends id.SemanticIdentity>(
        existingModels: Iterable<id.SemanticIdentity>,
        modelsPreviouslyMarkedForDeletion: Map<string, ID>,
        modelsToDelete: Iterable<ID>
    ): ReadonlyArrayUpdate<S> {
        for (const existingModel of existingModels) {
            // TODO: instead of silently unmark for deletion, indicate this as an update, that elements are no longer to be deleted
            modelsPreviouslyMarkedForDeletion.delete(existingModel.id)
        }
        if (modelsPreviouslyMarkedForDeletion.size !== 0) {
            const deletion = ArrayUpdateCommand.deletion<S>(modelsPreviouslyMarkedForDeletion.values())
            const deletedModels = new Set(modelsPreviouslyMarkedForDeletion.keys())
            modelsPreviouslyMarkedForDeletion.clear()
            for (const model of modelsToDelete) {
                if (!deletedModels.has(model.id)) {
                    modelsPreviouslyMarkedForDeletion.set(model.id, model)
                }
            }
            // TODO: Instead of no update, return modification, indicating, that elements are about to be deleted
            return ArrayUpdateCommand.all(deletion, ArrayUpdateCommand.noUpdate())
        }
        for (const model of modelsToDelete) {
            modelsPreviouslyMarkedForDeletion.set(model.id, model)
        }
        return ArrayUpdateCommand.noUpdate()
    }
}
