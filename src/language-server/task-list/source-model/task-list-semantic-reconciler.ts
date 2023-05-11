import { MultiMap } from "langium";
import * as ast from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { SemanticTask } from "./task-list-semantic-model";
import { TaskListSemanticModelState } from "./task-list-semantic-state";

export class TaskListSemanticModelReconciler {
    private semanticModelState: TaskListSemanticModelState

    public constructor(services: TaskListServices) {
        this.semanticModelState = services.sourceModel.TaskListSemanticModelState
    }

    public reconcileSemanticWithLangiumModel(langiumDocumentUri: string, model: ast.Model) {
        const semanticModelIndex = this.semanticModelState.get(langiumDocumentUri)
        const tasksToAdd: ast.Task[] = []
        const tasksToRemove: MultiMap<string, SemanticTask> = semanticModelIndex.tasksByName
        
        model.tasks.forEach(task => {
            const existingSemanticTasksByName = tasksToRemove.get(task.name)
            if (existingSemanticTasksByName.length === 0) {
                tasksToAdd.push(task)
            } else {
                tasksToRemove.delete(task.name, existingSemanticTasksByName[0])
            }
        })
        semanticModelIndex.removeTasks(tasksToRemove.values())
        semanticModelIndex.addTasks(tasksToAdd)
    }
}