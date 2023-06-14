import { stream } from 'langium'
import type * as ast from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import type { TaskListDocument } from '../workspace/documents'
import type { TaskListIdentityManager } from './task-list-identity-manager'
import type { Task, TransitionDerivativeIdentity } from './task-list-identity'
import { Model } from './task-list-identity'
import * as src from '../../../langium-model-server/source/model'
import * as source from '../source/model'

//TODO: When elaborating LMS into a library, make sure reconciler is defined and linked at that level
export class TaskListIdentityReconciler {
    private identityManager: TaskListIdentityManager

    public constructor(services: TaskListServices) {
        this.identityManager = services.semantic.IdentityManager
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
        const identityIndex = this.identityManager.getIdentityIndex(document)
        const tasksUpdate: src.ArrayUpdate<source.Task> = {}
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
            const taskUpdate = semanticDomain.identifyTask(task, identityTask.id)
            if (taskUpdate)
                src.ArrayUpdate.pushChange(tasksUpdate, taskUpdate)
        })
        // Deletion of not mapped tasks. Even though transitions (on the AST level) are composite children of source Task,
        // they still have to be deleted separately (to simplify Changes creation)
        identityIndex.deleteTasksWithRelatedTransitions(existingUnmappedTasks.values())

        //NOTE: ITERATION 2: mapping Transitions
        const existingUnmappedTransitions = identityIndex.transitionsByDerivativeIdentity
        // Preparing data for the iteration (source task id + target task id => Transition).
        stream(semanticDomain.getIdentifiedTasks())
            .flatMap((sourceTask): TransitionDerivativeIdentity[] => semanticDomain.getValidTargetTasks(sourceTask)
                .map(targetTask => [
                    sourceTask.id,
                    this.identityManager.getTaskId(targetTask)
                ])
            ) // Actual mapping
            .forEach(transitionDerivativeIdentity => {
                let identityTransition = existingUnmappedTransitions.get(transitionDerivativeIdentity)
                if (identityTransition) {
                    existingUnmappedTransitions.delete(transitionDerivativeIdentity)
                } else {
                    identityTransition = Model.newTransition(transitionDerivativeIdentity)
                    identityIndex.addTransition(identityTransition)
                }
                semanticDomain.identifyTransition(transitionDerivativeIdentity, identityTransition.id)
            })
        identityIndex.deleteTransitions(existingUnmappedTransitions.values())

        return source.ModelUpdate.create(identityIndex.id, tasksUpdate)
    }
}
