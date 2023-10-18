import * as src from '../../../langium-model-server/lms/model'
import type { IdentityReconciler } from '../../../langium-model-server/semantic/identity-reconciler'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type * as ast from '../../generated/ast'
import type { TaskListIdentityManager } from '../identity/manager'
import { TransitionDerivativeName } from '../identity/model'
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

        const taskIdentities = this.identityManager.getIdentityIndex(document).tasks
        const updateCalculator = this.modelUpdateCalculators.getOrCreateCalculator(document)
        const semanticDomain = document.semanticDomain

        const existingUnmappedIdentities = new Set(taskIdentities.values())
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidatedTasks(astModel)
            .forEach(task => {
                let taskIdentity = taskIdentities.byName(task.name)
                if (taskIdentity) {
                    existingUnmappedIdentities.delete(taskIdentity)
                } else {
                    taskIdentity = taskIdentities.addNew(task.name)
                }
                semanticDomain.identifyTask(task, taskIdentity)
            })
        // Deletion of not mapped tasks. Even though transitions (on the AST level) are composite children of source Task,
        // they still have to be deleted separately (**to simplify Updates creation**)
        const tasksUpdate = updateCalculator.applyTasksUpdate(existingUnmappedIdentities.values())

        if (!src.ArrayUpdate.isEmpty(tasksUpdate)) update.tasks = src.ArrayUpdate.create(tasksUpdate)
    }

    // Example of how Identity of non Ast-based element is reconciled
    private reconcileTransitions(document: Initialized<TaskListDocument>, update: src.Update<source.Model>) {

        const transitionIdentities = this.identityManager.getIdentityIndex(document).transitions
        const updateCalculator = this.modelUpdateCalculators.getOrCreateCalculator(document)
        const semanticDomain = document.semanticDomain

        const existingUnmappedIdentities = new Set(transitionIdentities.values())
        semanticDomain.getValidatedTransitions()
            .forEach(transition => {
                const name = TransitionDerivativeName.ofNew(transition)
                let transitionIdentity = transitionIdentities.byName(name)
                if (transitionIdentity) {
                    existingUnmappedIdentities.delete(transitionIdentity)
                } else {
                    transitionIdentity = transitionIdentities.addNew(name)
                }
                semanticDomain.identifyTransition(transition, transitionIdentity)
            })
        const transitionsUpdate = updateCalculator.applyTransitionsUpdate(existingUnmappedIdentities.values())

        if (!src.ArrayUpdate.isEmpty(transitionsUpdate)) update.transitions = src.ArrayUpdate.create(transitionsUpdate)
    }
}
