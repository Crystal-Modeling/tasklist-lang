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

        const model: ast.Model = document.parseResult.value
        const semanticModelIndex = this.semanticModelState.get(document.textDocument.uri)
        const tasksToAdd: ast.Task[] = []
        const tasksToRemove: Map<string, SemanticTask> = semanticModelIndex.tasksByName

        model.tasks.forEach(task => {
            if (isCorrectlyNamed(task)) {
                if (!tasksToRemove.delete(task.name)) {
                    tasksToAdd.push(task)
                }
            }
        })
        semanticModelIndex.removeTasks(tasksToRemove.values())
        semanticModelIndex.addTasks(tasksToAdd)
    }
}