import * as id from '../../../langium-model-server/identity/model'
import type { ReadonlyArrayUpdate , ElementUpdate} from '../../../langium-model-server/lms/model'
import { ArrayUpdate, ArrayUpdateCommand, RootUpdate, Update } from '../../../langium-model-server/lms/model'
import { AbstractModelUpdateCalculators, compareModelWithExistingBefore, deleteModels, type ModelUpdateCalculator } from '../../../langium-model-server/lms/model-update-calculation'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type * as ast from '../../generated/ast'
import * as identity from '../identity/model'
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
        const updates = Array.from(existingTasks, task => compareModelWithExistingBefore(
            this._tasksMarkedForDeletion,
            this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain),
            task,
            Task.create,
            applyTaskChanges,
        ))
        const deletion: ReadonlyArrayUpdate<Task> = deleteModels(
            this._tasksMarkedForDeletion,
            this.semanticDomain.getPreviousIdentifiedTask.bind(this.semanticDomain),
            identitiesToDelete,
        )

        return ArrayUpdateCommand.all(...updates, deletion)
    }

    public calculateTransitionsUpdate(identitiesToDelete: Iterable<identity.TransitionIdentity>): ReadonlyArrayUpdate<Transition> {
        const existingTransitions = this.semanticDomain.identifiedTransitions.values()
        const updates = Array.from(existingTransitions, transition => compareModelWithExistingBefore(
            this._transitionsMarkedForDeletion,
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
            transition,
            Transition.create,
            applyTransitionChanges,
        ))
        const deletion: ReadonlyArrayUpdate<Transition> = deleteModels(
            this._transitionsMarkedForDeletion,
            this.semanticDomain.getPreviousIdentifiedTransition.bind(this.semanticDomain),
            identitiesToDelete,
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
}

function applyTaskChanges(update: ElementUpdate<Task>, previous: sem.Identified<ast.Task> | identity.TaskIdentity, current: sem.Identified<ast.Task>): void {
    Update.assignIfUpdated(update, 'name', previous.name, current.name, '')
    Update.assignIfUpdated(update, 'content', (previous as sem.Identified<ast.Task>)?.content, current.content, '')
}

function applyTransitionChanges(update: ElementUpdate<Transition>,
    previous: sem.Identified<semantic.Transition> | identity.TransitionIdentity,
    current: sem.Identified<semantic.Transition>
): void {
    const previousProperties = identity.TransitionDerivativeName.toProperties(previous.name)
    const currentProperties = identity.TransitionDerivativeName.toProperties(current.name)
    Update.assignIfUpdated(update, 'sourceTaskId', previousProperties.sourceTaskId, currentProperties.sourceTaskId)
    Update.assignIfUpdated(update, 'targetTaskId', previousProperties.targetTaskId, currentProperties.targetTaskId)
}
