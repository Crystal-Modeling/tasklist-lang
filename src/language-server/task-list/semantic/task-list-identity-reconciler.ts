import { stream } from 'langium'
import type { IdentityReconciler } from '../../../langium-model-server/semantic/identity-reconciler'
import * as src from '../../../langium-model-server/source/model'
import type * as ast from '../../generated/ast'
import type * as source from '../source/model'
import type { TaskListSourceUpdateManager } from '../source/task-list-source-update-manager'
import type { TaskListServices } from '../task-list-module'
import { type TaskListDocument } from '../workspace/documents'
import type * as semantic from './model'
import type { Task } from './task-list-identity'
import { Model } from './task-list-identity'
import type { TaskListIdentityManager } from './task-list-identity-manager'

export class TaskListIdentityReconciler implements IdentityReconciler<source.Model, TaskListDocument>{
    private identityManager: TaskListIdentityManager
    private sourceUpdateManager: TaskListSourceUpdateManager

    public constructor(services: TaskListServices) {
        this.identityManager = services.semantic.IdentityManager
        this.sourceUpdateManager = services.source.SourceUpdateManager
    }
    identityReconciliationIterations = [
        this.reconcileTasks.bind(this),
        this.reconcileTransitions.bind(this),
    ]

    private reconcileTasks(_document: TaskListDocument, _update: src.Update<source.Model>) {
        // const doc: LmsDocument<ast.Model> = document
        // this.reconcileTransitions(doc, update)
    }

    private reconcileTransitions(_document: TaskListDocument, _update: src.Update<source.Model>) {

    }

    public reconcileIdentityWithLanguageModel(document: TaskListDocument): src.Update<source.Model> {

        /* NOTE: So, the problem can be characterized as following:

        - I do mapping from existing structure (AST), not optimized for search element by derivative identity (name)
        - I do mapping to identity, which I have control for, therefore, can make it indexed, and optimized for data manipulations
        - That is why I traverse the language model!
        - When the source model (AST) is not linear (with nested submodels), I do traversing in several iterations.
        In previous iteration I prepare data for the next iteration (`targetTasksByMappedSourceTaskId`)
        - I need the concept of language model _semantical validity_, that is, which node from AST do I map to Source Model?
          = which AST node I assume correct enough to track his identity?
        */

        // Preparation: getting services, and AST root
        const tasksUpdate: src.ArrayUpdate<source.Task> = {}
        const transitionsUpdate: src.ArrayUpdate<source.Transition> = {}

        const identityIndex = this.identityManager.getIdentityIndex(document)
        const updateCalculator = this.sourceUpdateManager.getUpdateCalculator(document)
        const astModel: ast.Model = document.parseResult.value
        //HACK: Relying on the fact that in this function `document` is in its final State
        const semanticDomain = document.semanticDomain!

        // NOTE: ITERATION 1: mapping Tasks
        const existingUnmappedTasks: Map<string, Task> = identityIndex.tasksByName
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidTasks(astModel).forEach(task => {
            let identityTask = existingUnmappedTasks.get(task.name)
            if (identityTask) {
                existingUnmappedTasks.delete(task.name)
            } else {
                identityTask = Model.newTask(task)
                identityIndex.addTask(identityTask)
            }
            semanticDomain.identifyTask(task, identityTask.id)
        })
        // Deletion of not mapped tasks. Even though transitions (on the AST level) are composite children of source Task,
        // they still have to be deleted separately (**to simplify Changes creation**)
        const calculatedTasksUpdate = updateCalculator.calculateTasksUpdate(existingUnmappedTasks.values())
        console.debug('===> Calculated Tasks Update', calculatedTasksUpdate)
        identityIndex.deleteTasks(calculatedTasksUpdate.removedIds ?? [])
        src.ArrayUpdate.apply(tasksUpdate, calculatedTasksUpdate)

        //NOTE: ITERATION 2: mapping Transitions
        const existingUnmappedTransitions = identityIndex.transitionsByDerivativeIdentity
        // Preparing data for the iteration (Transition Derivative Identity (source task id + target task id) => Transition).
        stream(semanticDomain.getIdentifiedTasks())
            .flatMap(sourceTask => semanticDomain.getValidTargetTasks(sourceTask)
                .map((targetTask): semantic.TransitionDerivativeIdentity => [
                    sourceTask.id,
                    this.identityManager.getTaskId(targetTask)
                ])
            ) // Actual mapping
            .forEach(transition => {
                let identityTransition = existingUnmappedTransitions.get(transition)
                if (identityTransition) {
                    existingUnmappedTransitions.delete(transition)
                } else {
                    identityTransition = Model.newTransition(transition)
                    identityIndex.addTransition(identityTransition)
                }
                semanticDomain.identifyTransition(transition, identityTransition.id)
            })
        const calculatedTransitionsUpdate = updateCalculator.calculateTransitionsUpdate(existingUnmappedTransitions.values())
        console.debug('===> Calculated Transitions Update', calculatedTransitionsUpdate)
        identityIndex.deleteTransitions(calculatedTransitionsUpdate.removedIds ?? [])
        src.ArrayUpdate.apply(transitionsUpdate, calculatedTransitionsUpdate)

        return {
            id: identityIndex.id,
            tasks: src.ArrayUpdate.isEmpty(tasksUpdate) ? undefined : tasksUpdate,
            transitions: src.ArrayUpdate.isEmpty(transitionsUpdate) ? undefined : transitionsUpdate
        }
    }
}
