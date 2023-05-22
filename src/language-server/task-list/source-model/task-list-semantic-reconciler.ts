import { MultiMap, Stream, stream } from "langium";
import * as ast from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { TaskListDocument } from "../workspace/documents";
import { SemanticTask } from "./task-list-semantic-model";
import { TaskListSemanticIndexManager } from "./task-list-semantic-manager";

export class TaskListSemanticModelReconciler {
    private semanticIndexManager: TaskListSemanticIndexManager

    public constructor(services: TaskListServices) {
        this.semanticIndexManager = services.sourceModel.SemanticIndexManager
    }

    public reconcileSemanticWithLangiumModel(document: TaskListDocument) {
        const isCorrectlyNamed = (task: ast.Task) => !document.incorrectlyNamedTasks?.has(task)
        const isResolvedAndCorrectlyNamed = (task: ast.Task | undefined): task is ast.Task => !!task && isCorrectlyNamed(task)
        const getSemanticTaskId = (task: ast.Task) => this.semanticIndexManager.getTaskId(task)
        const getValidTargetTasks = (task: ast.Task): Stream<ast.Task> => stream(task.references)
            .map(ref => (ref.ref))
            .filter(isResolvedAndCorrectlyNamed)
        const getValidTargetSemanticTaskIds = (task: ast.Task): Stream<string> => getValidTargetTasks(task)
            .map(getSemanticTaskId)
            .filter((targetTaskId): targetTaskId is string => !!targetTaskId)

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
        const targetTasksByMappedSourceTaskId: MultiMap<string, ast.Task> = new MultiMap()
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        model.tasks.forEach(task => {
            if (isCorrectlyNamed(task)) {
                const semanticTask = existingUnmappedTasks.get(task.name)
                if (semanticTask) {
                    existingUnmappedTasks.delete(task.name)
                    targetTasksByMappedSourceTaskId.addAll(semanticTask.id, getValidTargetTasks(task))
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
        targetTasksByMappedSourceTaskId.entries().forEach(([mappedSourceTaskId, targetTask]) => {
            const targetTaskId = this.semanticIndexManager.getTaskId(targetTask)
            if (!targetTaskId || !existingUnmappedTransitions.delete([mappedSourceTaskId, targetTaskId])) {
                newTransitionsForMappedSourceTaskId.push([mappedSourceTaskId, targetTask])
            }
        })
        semanticModelIndex.deleteTransitions(existingUnmappedTransitions.values())

        //NOTE: POST-ITERATION: now unmapped source elements can be added to semantic model
        this.semanticIndexManager.addTasksWithTransitionsFrom(semanticModelIndex, newTasks, getValidTargetSemanticTaskIds)
        this.semanticIndexManager.addTransitionsForSourceTaskId(semanticModelIndex, newTransitionsForMappedSourceTaskId, getSemanticTaskId)
    }
}