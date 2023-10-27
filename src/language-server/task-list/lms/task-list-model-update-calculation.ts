import * as id from '../../../langium-model-server/identity/model'
import type { ReadonlyArrayUpdate } from '../../../langium-model-server/lms/model'
import { ArrayUpdate, ArrayUpdateCommand, RootUpdate } from '../../../langium-model-server/lms/model'
import { AbstractModelUpdateCalculators, compareModelWithExistingBefore, deleteModels, type ModelUpdateCalculator } from '../../../langium-model-server/lms/model-update-calculation'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type { TaskListIdentityIndex } from '../identity/indexed'
import type { TaskListIdentityManager } from '../identity/manager'
import type { QueriableTaskListSemanticDomain } from '../semantic/task-list-semantic-domain'
import type { TaskListServices } from '../task-list-module'
import type { TaskListDocument } from '../workspace/documents'
import type { Model } from './model'
import { Task, Transition } from './model'

export class TaskListModelUpdateCalculators extends AbstractModelUpdateCalculators<Model> {

    private identityManager: TaskListIdentityManager

    public constructor(services: TaskListServices) {
        super()
        this.identityManager = services.identity.IdentityManager
    }

    public override getOrCreateCalculator(lmsDocument: Initialized<TaskListDocument>): TaskListModelUpdateCalculator {
        return super.getOrCreateCalculator(lmsDocument) as TaskListModelUpdateCalculator
    }

    protected override createCalculator(lmsDocument: Initialized<TaskListDocument>): TaskListModelUpdateCalculator {
        return new TaskListModelUpdateCalculator(lmsDocument.semanticDomain, this.identityManager.getIdentityIndex(lmsDocument))
    }

}

export class TaskListModelUpdateCalculator implements ModelUpdateCalculator<Model> {

    private semanticDomain: QueriableTaskListSemanticDomain
    private identityIndex: TaskListIdentityIndex

    public constructor(taskListSemanticDomain: QueriableTaskListSemanticDomain, identityIndex: TaskListIdentityIndex) {
        this.semanticDomain = taskListSemanticDomain
        this.identityIndex = identityIndex
    }

    public calculateUpdate(deletion: sem.UnmappedIdentities<Model>): RootUpdate<Model> {
        const tasksUpdate = this.calculateTasksUpdate(deletion.tasks ?? [])
        const transitionsUpdate = this.calculateTransitionsUpdate(deletion.transitions ?? [])

        const update = RootUpdate.createEmpty<Model>(this.semanticDomain.rootId, id.ModelUri.root)
        if (!ArrayUpdate.isEmpty(tasksUpdate)) update.tasks = ArrayUpdate.create(tasksUpdate)
        if (!ArrayUpdate.isEmpty(transitionsUpdate)) update.transitions = ArrayUpdate.create(transitionsUpdate)
        return update
    }

    public clearSoftDeletedIdentities(): RootUpdate<Model> {
        const tasksDeletion = ArrayUpdateCommand.deletion<Task>(Array.from(this.identityIndex.tasks.allSoftDeleted(), identity => identity.remove()))
        const transitionsDeletion = ArrayUpdateCommand.deletion<Transition>(Array.from(this.identityIndex.transitions.allSoftDeleted(), identity => identity.remove()))

        const rootUpdate = RootUpdate.createEmpty<Model>(this.semanticDomain.rootId, id.ModelUri.root)
        if (!ArrayUpdate.isEmpty(tasksDeletion)) rootUpdate.tasks = ArrayUpdate.create(tasksDeletion)
        if (!ArrayUpdate.isEmpty(transitionsDeletion)) rootUpdate.transitions = ArrayUpdate.create(transitionsDeletion)
        return rootUpdate
    }

    /**
     * Calculates tasks update and applies identities deletion / restoration to embedded identity index
     */
    private calculateTasksUpdate(identitiesToDelete: Iterable<id.Identity>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.identifiedTasks.values()
        const updates = Array.from(existingTasks, task => compareModelWithExistingBefore(
            this.semanticDomain.getPreviousIdentifiedTask(task.$identity.id),
            task,
            Task.create,
            Task.applyChanges,
        ))
        const deletion: ReadonlyArrayUpdate<Task> = deleteModels(
            this.identityIndex.tasks.allSoftDeleted.bind(this.identityIndex.tasks),
            this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain),
            identitiesToDelete,
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    /**
     * Calculates transitions update and applies identities deletion / restoration to embedded identity index
     */
    private calculateTransitionsUpdate(identitiesToDelete: Iterable<id.Identity>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.identifiedTransitions.values()
        const updates = Array.from(existingTransitions, transition => compareModelWithExistingBefore(
            this.semanticDomain.getPreviousIdentifiedTransition(transition.$identity.id),
            transition,
            Transition.create,
            Transition.applyChanges,
        ))
        const deletion: ReadonlyArrayUpdate<Transition> = deleteModels(
            this.identityIndex.transitions.allSoftDeleted.bind(this.identityIndex.transitions),
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
            identitiesToDelete,
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }
}
