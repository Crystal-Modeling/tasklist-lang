import type { IdentityReconciler } from '../../../langium-model-server/semantic/identity-reconciler'
import { AstRootNode } from '../../../langium-model-server/semantic/model'
import * as src from '../../../langium-model-server/lms/model'
import type * as ast from '../../generated/ast'
import type * as source from '../lms/model'
import type { TaskListSourceUpdateManager } from '../lms/task-list-source-update-manager'
import type { TaskListServices } from '../task-list-module'
import { type TaskListDocument } from '../workspace/documents'
import { Model } from './task-list-identity'
import type { TaskListIdentityManager } from './task-list-identity-manager'

export class TaskListIdentityReconciler implements IdentityReconciler<source.Model, TaskListDocument>{
    private identityManager: TaskListIdentityManager
    private sourceUpdateManager: TaskListSourceUpdateManager

    public constructor(services: TaskListServices) {
        this.identityManager = services.semantic.IdentityManager
        this.sourceUpdateManager = services.lms.SourceUpdateManager
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
    private reconcileTasks(document: TaskListDocument, update: src.Update<source.Model>) {

        const identityIndex = this.identityManager.getIdentityIndex(document)
        const updateCalculator = this.sourceUpdateManager.getUpdateCalculator(document)
        const semanticDomain = document.semanticDomain!
        // NOTE: Here I am expressing an idea, that perhaps I will have to have some sort of nested model indices,
        // which would make it generally necessary to pass the parent model into the semantic domain when requesting some (valid/identified) models
        const astModel: ast.Model = document.parseResult.value

        // TODO: Suggest AstRootNode as a specific interface for Langium
        const rootNode = AstRootNode.create(astModel)
        if (!rootNode) {
            throw new Error('Expected Model to be a root node, but somehow it was not!. Model: ' + astModel)
        }
        semanticDomain.identifyRootNode(rootNode, identityIndex.id)

        const existingUnmappedTasks = identityIndex.tasksByName
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidTasks(astModel)
            .forEach(task => {
                let taskIdentity = existingUnmappedTasks.get(task.name)
                if (taskIdentity) {
                    existingUnmappedTasks.delete(task.name)
                } else {
                    taskIdentity = Model.newTask(task)
                    identityIndex.addTask(taskIdentity)
                }
                semanticDomain.identifyTask(task, taskIdentity.id)
            })
        // Deletion of not mapped tasks. Even though transitions (on the AST level) are composite children of source Task,
        // they still have to be deleted separately (**to simplify Updates creation**)
        const tasksUpdate = updateCalculator.calculateTasksUpdate(existingUnmappedTasks.values())
        identityIndex.deleteTasks(tasksUpdate.removedIds ?? [])

        if (!src.ArrayUpdate.isEmpty(tasksUpdate)) update.tasks = src.ArrayUpdate.create(tasksUpdate)
    }

    // Example of how Identity of non Ast-based element is reconciled
    private reconcileTransitions(document: TaskListDocument, update: src.Update<source.Model>) {

        const identityIndex = this.identityManager.getIdentityIndex(document)
        const updateCalculator = this.sourceUpdateManager.getUpdateCalculator(document)
        const semanticDomain = document.semanticDomain!

        const existingUnmappedTransitions = identityIndex.transitionsByName
        semanticDomain.getValidTransitions()
            .forEach(transition => {
                let transitionIdentity = existingUnmappedTransitions.get(transition.name)
                if (transitionIdentity) {
                    existingUnmappedTransitions.delete(transition.name)
                } else {
                    transitionIdentity = Model.newTransition(transition)
                    identityIndex.addTransition(transitionIdentity)
                }
                semanticDomain.identifyTransition(transition, transitionIdentity.id)
            })
        const transitionsUpdate = updateCalculator.calculateTransitionsUpdate(existingUnmappedTransitions.values())
        identityIndex.deleteTransitions(transitionsUpdate.removedIds ?? [])

        if (!src.ArrayUpdate.isEmpty(transitionsUpdate)) update.transitions = src.ArrayUpdate.create(transitionsUpdate)
    }
}
