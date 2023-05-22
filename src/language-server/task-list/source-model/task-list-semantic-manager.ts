import { Stream, getDocument, stream } from "langium";
import { SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { Task } from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { SemanticModel, SemanticModelIndex, SemanticTask } from "./task-list-semantic-model";
import { SemanticIndexManager } from "../../../source-model-server/source-model/semantic-manager";

/**
 * Stores {@link SemanticModel} per URI of Langium-managed TextDocument.
 * It has control over all {@link SemanticModelIndex}es existing. Therefore, it can consume the link to SemanticModelIndex to perform computation?
 */
export class TaskListSemanticIndexManager extends Map<string, SemanticModelIndex> implements SemanticIndexManager {

    private semanticModelStorage: SemanticModelStorage

    public constructor(services: TaskListServices) {
        super()
        this.semanticModelStorage = services.sourceModel.SemanticModelStorage
    }

    public addTasksWithTransitionsFrom(semanticModelIndex: SemanticModelIndex,
        tasks: Iterable<Task>,
        validTargetSemanticTaskIdsGetter: (sourceTask: Task) => Stream<string>) {
        const semanticTasksWithTasks = stream(tasks)
            .map((task): [SemanticTask, Task] => [SemanticModel.newTask(task), task])
        semanticTasksWithTasks
            .forEach(([semanticTask,]) => semanticModelIndex.newTask(semanticTask))

        semanticTasksWithTasks.forEach(([semanticTask, sourceTask]) => {
            const sourceTaskId = semanticTask.id
            validTargetSemanticTaskIdsGetter(sourceTask)
                .forEach(id => semanticModelIndex.newTransition(SemanticModel.newTransition(sourceTaskId, id)))
        })
    }

    public addTransitionsForSourceTaskId(semanticModelIndex: SemanticModelIndex, transitions: Iterable<[string, Task]>,
        semanticTaskIdGetter: (task: Task) => string | undefined) {
        for (const [sourceTaskId, targetTask] of transitions) {
            const targetTaskId = semanticTaskIdGetter(targetTask)
            if (targetTaskId) {
                semanticModelIndex.newTransition(SemanticModel.newTransition(sourceTaskId, targetTaskId))
            }
        }
    }

    public getTaskId(task: Task): string | undefined {
        const languageDocumentUri = getDocument(task).textDocument.uri
        return this.get(languageDocumentUri).getTaskIdByName(task.name)
    }

    public loadSemanticModel(languageDocumentUri: string): void {
        console.debug("Loading semantic model for URI", languageDocumentUri)
        const semanticModel = this.semanticModelStorage.loadSemanticModelFromFile(languageDocumentUri, SemanticModel.is)
        this.set(languageDocumentUri, new AccessibleSemanticModelIndex(semanticModel))
    }

    public saveSemanticModel(languageDocumentUri: string): void {
        console.debug("Saving semantic model...")
        const semanticModel = (this.get(languageDocumentUri) as AccessibleSemanticModelIndex).model
        this.semanticModelStorage.saveSemanticModelToFile(languageDocumentUri, semanticModel)
    }

    public deleteSemanticModel(languageDocumentUri: string): void {
        console.debug("Deleting semantic model for URI", languageDocumentUri)
        this.delete(languageDocumentUri)
        this.semanticModelStorage.deleteSemanticModelFile(languageDocumentUri)
    }

    override get(languageDocumentUri: string): SemanticModelIndex {
        const loadedSemanticModel = super.get(languageDocumentUri)
        if (loadedSemanticModel) {
            return loadedSemanticModel
        }
        this.loadSemanticModel(languageDocumentUri)
        return super.get(languageDocumentUri)!
    }

}
class AccessibleSemanticModelIndex extends SemanticModelIndex {

    public override get model(): SemanticModel {
        return this._model
    }
}