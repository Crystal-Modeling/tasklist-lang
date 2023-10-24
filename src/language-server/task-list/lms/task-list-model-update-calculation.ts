import * as id from '../../../langium-model-server/identity/model'
import type { ElementUpdate, ReadonlyArrayUpdate } from '../../../langium-model-server/lms/model'
import { ArrayUpdate, ArrayUpdateCommand, RootUpdate, Update } from '../../../langium-model-server/lms/model'
import { AbstractModelUpdateCalculators, compareModelWithExistingBefore, deleteIdentity, deleteModels, type ModelUpdateCalculator } from '../../../langium-model-server/lms/model-update-calculation'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type { TaskListIdentityIndex } from '../identity/identity-index'
import type { TaskListIdentityManager } from '../identity/manager'
import type * as identity from '../identity/model'
import type * as semantic from '../semantic/model'
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

    /**
     * Calculates tasks update and applies identities deletion / restoration to embedded identity index
     */
    public applyTasksUpdate(identitiesToDelete: Iterable<identity.TaskIdentity>): ReadonlyArrayUpdate<Task> {
        const existingTasks = this.semanticDomain.identifiedTasks.values()
        const updates = Array.from(existingTasks, task => compareModelWithExistingBefore(
            this.semanticDomain.getPreviousIdentifiedTask(task.$identity.id),
            task,
            Task.create,
            applyTaskChanges,
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
    public applyTransitionsUpdate(identitiesToDelete: Iterable<identity.TransitionIdentity>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.identifiedTransitions.values()
        const updates = Array.from(existingTransitions, transition => compareModelWithExistingBefore(
            this.semanticDomain.getPreviousIdentifiedTransition(transition.$identity.id),
            transition,
            Transition.create,
            applyTransitionChanges,
        ))
        const deletion: ReadonlyArrayUpdate<Transition> = deleteModels(
            this.identityIndex.transitions.allSoftDeleted.bind(this.identityIndex.transitions),
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
            identitiesToDelete,
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public clearSoftDeletedIdentities(): RootUpdate<Model> {
        const tasksDeletion = ArrayUpdateCommand.deletion<Task>(Array.from(this.identityIndex.tasks.allSoftDeleted(), deleteIdentity))
        const transitionsDeletion = ArrayUpdateCommand.deletion<Transition>(Array.from(this.identityIndex.transitions.allSoftDeleted(), deleteIdentity))

        const rootUpdate = RootUpdate.createEmpty<Model>(this.semanticDomain.rootId, id.ModelUri.root)
        if (!ArrayUpdate.isEmpty(tasksDeletion)) rootUpdate.tasks = ArrayUpdate.create(tasksDeletion)
        if (!ArrayUpdate.isEmpty(transitionsDeletion)) rootUpdate.transitions = ArrayUpdate.create(transitionsDeletion)
        return rootUpdate
    }
}

function applyTaskChanges(update: ElementUpdate<Task>, previous: semantic.IdentifiedTask | identity.TaskIdentity, current: semantic.IdentifiedTask): void {
    if (previous !== current.$identity) {
        Update.assignIfUpdated(update, 'name', previous.name, current.name, '')
        Update.assignIfUpdated(update, 'content', (previous as semantic.IdentifiedTask).content, current.content, '')
    } else {
        console.info(`Can't compare attributes of Task '${current.$identity.id}' with name=${current.name}: previous semantic Task is missing`)
        Update.assign(update, 'name', current.name, '')
        Update.assign(update, 'content', current.content, '')
    }
}

function applyTransitionChanges(update: ElementUpdate<Transition>,
    previous: semantic.IdentifiedTransition | identity.TransitionIdentity,
    current: semantic.IdentifiedTransition
): void {
    if (previous !== current.$identity) {
        const previousModel = previous as semantic.IdentifiedTransition
        Update.assignIfUpdated(update, 'sourceTaskId', previousModel.sourceTask.$identity.id, current.sourceTask.$identity.id)
        Update.assignIfUpdated(update, 'targetTaskId', previousModel.targetTask.$identity.id, current.targetTask.$identity.id)
    } else {
        console.info(`Can't compare attributes of Transition '${current.$identity.id}' with name=${current.$identity.name}: previous semantic Transition is missing`)
        Update.assign(update, 'sourceTaskId', current.sourceTask.$identity.id)
        Update.assign(update, 'targetTaskId', current.targetTask.$identity.id)
    }
}
