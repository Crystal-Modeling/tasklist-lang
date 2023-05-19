import { MultiMap, Stream, stream } from "langium";
import * as ast from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { TaskListDocument } from "../workspace/documents";
import { SemanticTask } from "./task-list-semantic-model";
import { TaskListSemanticModelState } from "./task-list-semantic-state";

export class TaskListSemanticModelReconciler {
    private semanticModelState: TaskListSemanticModelState

    public constructor(services: TaskListServices) {
        this.semanticModelState = services.sourceModel.TaskListSemanticModelState
    }

    public reconcileSemanticWithLangiumModel(document: TaskListDocument) {
        const isCorrectlyNamed = (task: ast.Task) => !document.incorrectlyNamedTasks?.has(task)
        const isResolvedAndCorrectlyNamed = (task: ast.Task | undefined): task is ast.Task => !!task && isCorrectlyNamed(task)
        const getSemanticTaskId = (task: ast.Task) => this.semanticModelState.getTaskId(task)
        const getValidTargetTasks = (task: ast.Task): Stream<ast.Task> => stream(task.references)
            .map(ref => (ref.ref))
            .filter(isResolvedAndCorrectlyNamed)
        const getValidTargetSemanticTaskIds = (task: ast.Task): Stream<string> => getValidTargetTasks(task)
            .map(getSemanticTaskId)
            .filter((targetTaskId): targetTaskId is string => !!targetTaskId)

        const model: ast.Model = document.parseResult.value
        const semanticModelIndex = this.semanticModelState.get(document.textDocument.uri)
        const newTasks: ast.Task[] = []
        const existingUnmappedTasks: Map<string, SemanticTask> = semanticModelIndex.tasksByName
        const targetTasksByMappedSourceTaskId: MultiMap<string, ast.Task> = new MultiMap()

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
        semanticModelIndex.removeTasksWithRelatedTransitions(existingUnmappedTasks.values())

        const newTransitionsForMappedSourceTaskId: [string, ast.Task][] = []
        const existingUnmappedTransitions = semanticModelIndex.transitionsBySourceTaskIdAndTargetTaskId

        targetTasksByMappedSourceTaskId.entries().forEach(([mappedSourceTaskId, targetTask]) => {
            const targetTaskId = this.semanticModelState.getTaskId(targetTask)
            if (!targetTaskId || !existingUnmappedTransitions.delete([mappedSourceTaskId, targetTaskId])) {
                newTransitionsForMappedSourceTaskId.push([mappedSourceTaskId, targetTask])
            }
        })
        semanticModelIndex.removeTransitions(existingUnmappedTransitions.values())

        semanticModelIndex.addTasksWithTransitionsFrom(newTasks, getValidTargetSemanticTaskIds)
        semanticModelIndex.addTransitionsForSourceTaskId(newTransitionsForMappedSourceTaskId, getSemanticTaskId)
    }
}