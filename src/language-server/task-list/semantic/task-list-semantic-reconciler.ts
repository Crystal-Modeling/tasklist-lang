import type { Valid } from '../../../langium-model-server/semantic/semantic-types'
import type * as ast from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import type { TaskListDocument } from '../workspace/documents'
import type { TaskListSemanticIndexManager } from './task-list-semantic-manager'
import type { SemanticTask } from './task-list-semantic-model'
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
        const newTasks: Array<Valid<ast.Task>> = []
        const existingUnmappedTasks: Map<string, SemanticTask> = semanticModelIndex.tasksByName
        // Collecting data for the next iteration (source task id + target task => Transition). Notice, that I replaced
        // source task with source task id (using already mapped data to optimize further mapping)
        const validTargetTaskByMappedSourceTaskId: Array<[string, Valid<ast.Task>]> = []
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidTasks(model).forEach(task => {
            const semanticTask = existingUnmappedTasks.get(task.name)
            if (semanticTask) {
                existingUnmappedTasks.delete(task.name)
                semanticDomain.getValidTargetTasks(task)
                    .forEach(targetTask => validTargetTaskByMappedSourceTaskId.push([semanticTask.id, targetTask]))
            } else {
                newTasks.push(task)
            }
        })
        // Deletion can happen immediately after the mapping within the iteration (always?)
        semanticModelIndex.deleteTasksWithRelatedTransitions(existingUnmappedTasks.values())

        //NOTE: ITERATION 2: mapping Transitions
        const newTransitionsForMappedSourceTaskId: Array<[string, Valid<ast.Task>]> = []
        const existingUnmappedTransitions = semanticModelIndex.transitionsBySourceTaskIdAndTargetTaskId
        // Actual mapping
        validTargetTaskByMappedSourceTaskId.forEach(([mappedSourceTaskId, targetTask]) => {
            const targetTaskId = this.semanticIndexManager.getTaskId(targetTask)
            if (!targetTaskId || !existingUnmappedTransitions.delete([mappedSourceTaskId, targetTaskId])) {
                newTransitionsForMappedSourceTaskId.push([mappedSourceTaskId, targetTask])
            }
        })
        semanticModelIndex.deleteTransitions(existingUnmappedTransitions.values())

        //NOTE: POST-ITERATION: now unmapped source elements can be added to semantic model
        // Add new Tasks AND prepare new Transitions to be added for these new Tasks
        for (const task of newTasks) {
            const semanticTask = SemanticModel.newTask(task)
            semanticModelIndex.addTask(semanticTask)
            semanticDomain.getValidTargetTasks(task)
                .forEach(targetTask => newTransitionsForMappedSourceTaskId.push([semanticTask.id, targetTask]))
        }

        // Add new Transitions for existing Tasks
        for (const [sourceTaskId, targetTask] of newTransitionsForMappedSourceTaskId) {
            const targetTaskId = this.semanticIndexManager.getTaskId(targetTask)
            /*INCOMPLETE: If other semanticModel files are inconsistent (i.e., target task is missing),
            then this inconsistency propagates, because transition to this task will neither be created.
            However, I am not sure this inconsistency can exist: only if 2 files are modified simultaneously, I suppose,
            because each time LS loads, it performs semantic reconciliation phase for all the documents
            */
            if (targetTaskId) {
                semanticModelIndex.addTransition(SemanticModel.newTransition(sourceTaskId, targetTaskId))
            }
        }
    }
}
