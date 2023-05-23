import { Stream, stream } from "langium";
import * as ast from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { TaskListDocument } from "../workspace/documents";
import { TaskListSemanticIndexManager } from "./task-list-semantic-manager";
import { SemanticModel, SemanticTask } from "./task-list-semantic-model";

export class TaskListSemanticModelReconciler {
    private semanticIndexManager: TaskListSemanticIndexManager

    public constructor(services: TaskListServices) {
        this.semanticIndexManager = services.sourceModel.SemanticIndexManager
    }

    public reconcileSemanticWithLangiumModel(document: TaskListDocument) {
        /* NOTE: Reconciler is responsible for semantic model-specific domain logic:
        
        - Task is valid for Semantic Model (isCorrectlyNamed)
        - Aggregate function: getValidTargetTasks, which deals with Task internals, adding isCorrectlyNamed on top

        So that neither SemanticManager, nor SemanticModelIndex is responsible for traversing AST internals
        */
        const isCorrectlyNamed = (task: ast.Task) => !document.incorrectlyNamedTasks?.has(task)
        const isResolvedAndCorrectlyNamed = (task: ast.Task | undefined): task is ast.Task => !!task && isCorrectlyNamed(task)
        const getValidTargetTasks = (task: ast.Task): Stream<ast.Task> => stream(task.references)
            .map(ref => (ref.ref))
            .filter(isResolvedAndCorrectlyNamed)

        /* NOTE: So, the problem can be characterized as following:
        
        - I do mapping from existing structure (AST), not optimized for search element by identifier (name)
        - I do mapping to semantic model, which I have control for, therefore, can make it indexed, and optimized for data manipulations
        - That is why I traverse the source model!
        - When the source model (AST) is not linear (with nested submodels), I do traversing in several iterations.
        In previous iteration I prepare data for the next iteration (`targetTasksByMappedSourceTaskId`)
        - I need the concept of source model _validity_, that is, which node from AST do I map to SemanticModel?
          = which AST node I assume correct enough to track his identity?
        - 
        */

        // Preparation: getting services, and AST root
        const semanticModelIndex = this.semanticIndexManager.get(document.textDocument.uri)
        const model: ast.Model = document.parseResult.value

        // NOTE: ITERATION 1: mapping Tasks
        const newTasks: ast.Task[] = []
        const existingUnmappedTasks: Map<string, SemanticTask> = semanticModelIndex.tasksByName
        // Collecting data for the next iteration (source task id + target task => Transition). Notice, that I replaced
        // source task with source task id (using already mapped data to optimize further mapping)
        const validTargetTaskByMappedSourceTaskId: [string, ast.Task][] = []
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        model.tasks.forEach(task => {
            if (isCorrectlyNamed(task)) {
                const semanticTask = existingUnmappedTasks.get(task.name)
                if (semanticTask) {
                    existingUnmappedTasks.delete(task.name)
                    getValidTargetTasks(task)
                        .forEach(targetTask => validTargetTaskByMappedSourceTaskId.push([semanticTask.id, targetTask]))
                } else {
                    newTasks.push(task)
                }
            }
        })
        // Deletion can happen immediately after the mapping within the iteration (always?)
        semanticModelIndex.deleteTasksWithRelatedTransitions(existingUnmappedTasks.values())

        //NOTE: ITERATION 2: mapping Transitions
        const newTransitionsForMappedSourceTaskId: [string, ast.Task][] = []
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
            semanticModelIndex.newTask(semanticTask)
            getValidTargetTasks(task)
                .forEach(targetTask => newTransitionsForMappedSourceTaskId.push([semanticTask.id, targetTask]))
        }

        // Add new Transitions for existing Tasks
        for (const [sourceTaskId, targetTask] of newTransitionsForMappedSourceTaskId) {
            const targetTaskId = this.semanticIndexManager.getTaskId(targetTask)
            //INCOMPLETE: If other semanticModel files are inconsistent (i.e., target task is missing),
            // then this inconsistency propagates, because transition to this task will neither be created.
            // However, I am not sure this inconsistency can exist: only if 2 files are modified simultaneously, I suppose,
            // because each time LS loads, it performs semantic reconciliation phase for all the documents
            if (targetTaskId) {
                semanticModelIndex.newTransition(SemanticModel.newTransition(sourceTaskId, targetTaskId))
            }
        }
    }
}