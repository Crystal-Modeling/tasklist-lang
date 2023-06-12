import { stream } from 'langium'
import type * as ast from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import type { TaskListDocument } from '../workspace/documents'
import type { TaskListSemanticIndexManager } from './task-list-semantic-manager'
import type { SemanticTask, TransitionDerivativeIdentity } from './task-list-semantic-model'
import { SemanticModel } from './task-list-semantic-model'

//TODO: When elaborating LMS into a library, make sure reconciler is defined and linked at that level
export class TaskListSemanticModelReconciler {
    private semanticIndexManager: TaskListSemanticIndexManager

    public constructor(services: TaskListServices) {
        this.semanticIndexManager = services.semantic.SemanticIndexManager
    }

    public reconcileSemanticWithLangiumModel(document: TaskListDocument) {

        /* NOTE: So, the problem can be characterized as following:

        - I do mapping from existing structure (AST), not optimized for search element by identifier (name)
        - I do mapping to semantic model, which I have control for, therefore, can make it indexed, and optimized for data manipulations
        - That is why I traverse the source model!
        - When the source model (AST) is not linear (with nested submodels), I do traversing in several iterations.
        In previous iteration I prepare data for the next iteration (`targetTasksByMappedSourceTaskId`)
        - I need the concept of source model _semantical validity_, that is, which node from AST do I map to SemanticModel?
          = which AST node I assume correct enough to track his identity?
        */

        // Preparation: getting services, and AST root
        const semanticModelIndex = this.semanticIndexManager.getSemanticModelIndex(document)
        const model: ast.Model = document.parseResult.value
        //HACK: Relying on the fact that in this function `document` is in its final State
        const semanticDomain = document.semanticDomain!

        // NOTE: ITERATION 1: mapping Tasks
        const existingUnmappedTasks: Map<string, SemanticTask> = semanticModelIndex.tasksByName
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidTasks(model).forEach(task => {
            let semanticTask = existingUnmappedTasks.get(task.name)
            if (semanticTask) {
                existingUnmappedTasks.delete(task.name)
            } else {
                semanticTask = SemanticModel.newTask(task)
                semanticModelIndex.addTask(semanticTask)
            }
            semanticDomain.identifyTask(task, semanticTask.id)
        })
        // Deletion of not mapped tasks
        semanticModelIndex.deleteTasksWithRelatedTransitions(existingUnmappedTasks.values())

        //NOTE: ITERATION 2: mapping Transitions
        const existingUnmappedTransitions = semanticModelIndex.transitionsByDerivativeIdentity
        // Preparing data for the iteration (source task id + target task id => Transition).
        stream(semanticDomain.getIdentifiedTasks())
            .flatMap((identifiedTask): TransitionDerivativeIdentity[] => semanticDomain.getValidTargetTasks(identifiedTask)
                .map(targetTask => [
                    identifiedTask.id,
                    this.semanticIndexManager.getTaskId(targetTask)
                ])
            ) // Actual mapping
            .forEach(transitionDerivativeIdentity => {
                let semanticTransition = existingUnmappedTransitions.get(transitionDerivativeIdentity)
                if (semanticTransition) {
                    existingUnmappedTransitions.delete(transitionDerivativeIdentity)
                } else {
                    semanticTransition = SemanticModel.newTransition(transitionDerivativeIdentity)
                    semanticModelIndex.addTransition(semanticTransition)
                }
                semanticDomain.identifyTransition(transitionDerivativeIdentity, semanticTransition.id)
            })
        semanticModelIndex.deleteTransitions(existingUnmappedTransitions.values())
    }
}
