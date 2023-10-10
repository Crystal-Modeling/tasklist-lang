import * as src from '../../../langium-model-server/lms/model'
import type { IdentityReconciler } from '../../../langium-model-server/semantic/identity-reconciler'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type * as ast from '../../generated/ast'
import type { TaskListIdentityManager } from '../identity/manager'
import type * as source from '../lms/model'
import type { TaskListModelUpdateCalculators } from '../lms/task-list-model-update-calculation'
import type { TaskListServices } from '../task-list-module'
import { type TaskListDocument } from '../workspace/documents'

export class TaskListIdentityReconciler implements IdentityReconciler<source.Model, TaskListDocument>{
    private identityManager: TaskListIdentityManager
    private modelUpdateCalculators: TaskListModelUpdateCalculators

    public constructor(services: TaskListServices) {
        this.identityManager = services.identity.IdentityManager
        this.modelUpdateCalculators = services.lms.ModelUpdateCalculators
    }

    /* NOTE: So, the problem can be characterized as following:

    - I do mapping from existing structure (AST), not optimized for search element by derivative identity (name)
    - I do mapping to identity, which I have control for, therefore, can make it indexed, and optimized for data manipulations
    - That is why I traverse the language model!
    - When the source model (AST) is not linear (with nested submodels), I do traversing in several iterations.
    In previous iteration I prepare data for the next iteration (`targetTasksByMappedSourceTaskId`)
    - I need the concept of language model _semantical validity_, that is, which node from AST do I map to Source Model?
      = which AST node I assume correct enough to track his identity?
    */
    identityReconciliationIterations = [
        // NOTE: ITERATION 1: mapping Tasks
        this.reconcileTasks.bind(this),
        // NOTE: ITERATION 2: mapping Transitions
        this.reconcileTransitions.bind(this),
    ]

    // Example of how Identity of Ast-based element is reconciled
    private reconcileTasks(document: Initialized<TaskListDocument>, update: src.Update<source.Model>) {

        // NOTE: Here I am expressing an idea, that perhaps I will have to have some sort of nested model indices,
        // which would make it generally necessary to pass the parent model into the semantic domain when requesting some (valid/identified) models
        const astModel: ast.Model = document.parseResult.value

        const identityIndex = this.identityManager.getIdentityIndex(document)
        const updateCalculator = this.modelUpdateCalculators.getOrCreateCalculator(document)
        const semanticDomain = document.semanticDomain

        const existingUnmappedTasks = identityIndex.tasks.getCopyByName()
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidTasks(astModel)
            .forEach(task => {
                let taskIdentity = existingUnmappedTasks.get(task.name)
                if (taskIdentity) {
                    existingUnmappedTasks.delete(task.name)
                } else {
                    taskIdentity = identityIndex.tasks.addNew(task.name)
                }
                semanticDomain.identifyTask(task, taskIdentity)
            })
        // Deletion of not mapped tasks. Even though transitions (on the AST level) are composite children of source Task,
        // they still have to be deleted separately (**to simplify Updates creation**)
        const tasksUpdate = updateCalculator.calculateTasksUpdate(existingUnmappedTasks.values())
        identityIndex.tasks.delete(tasksUpdate.removedIds ?? [])

        if (!src.ArrayUpdate.isEmpty(tasksUpdate)) update.tasks = src.ArrayUpdate.create(tasksUpdate)
    }

    // Example of how Identity of non Ast-based element is reconciled
    private reconcileTransitions(document: Initialized<TaskListDocument>, update: src.Update<source.Model>) {

        const identityIndex = this.identityManager.getIdentityIndex(document)
        const updateCalculator = this.modelUpdateCalculators.getOrCreateCalculator(document)
        const semanticDomain = document.semanticDomain

        const existingUnmappedTransitions = identityIndex.transitions.getCopyByName()
        semanticDomain.getValidTransitions()
            .forEach(transition => {
                let transitionIdentity = existingUnmappedTransitions.get(transition.name)
                if (transitionIdentity) {
                    existingUnmappedTransitions.delete(transition.name)
                } else {
                    transitionIdentity = identityIndex.transitions.addNew(transition.name)
                }
                semanticDomain.identifyTransition(transition, transitionIdentity)
            })
        const transitionsUpdate = updateCalculator.calculateTransitionsUpdate(existingUnmappedTransitions.values())
        identityIndex.transitions.delete(transitionsUpdate.removedIds ?? [])

        if (!src.ArrayUpdate.isEmpty(transitionsUpdate)) update.transitions = src.ArrayUpdate.create(transitionsUpdate)
    }
}
