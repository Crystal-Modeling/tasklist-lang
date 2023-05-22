import { getDocument } from "langium";
import { SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { Task } from "../../generated/ast";
import { TaskListServices } from "../task-list-module";
import { SemanticModel, SemanticModelIndex } from "./task-list-semantic-model";
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

    loadSemanticModel(languageDocumentUri: string): void {
        console.debug("Loading semantic model for URI", languageDocumentUri)
        const semanticModel = this.semanticModelStorage.loadSemanticModelFromFile(languageDocumentUri, SemanticModel.is)
        this.set(languageDocumentUri, new AccessibleSemanticModelIndex(semanticModel))
    }

    saveSemanticModel(languageDocumentUri: string): void {
        console.debug("Saving semantic model...")
        const semanticModel = (this.get(languageDocumentUri) as AccessibleSemanticModelIndex).model
        this.semanticModelStorage.saveSemanticModelToFile(languageDocumentUri, semanticModel)
    }
    
    deleteSemanticModel(languageDocumentUri: string): void {
        console.debug("Deleting semantic model for URI", languageDocumentUri)
        this.delete(languageDocumentUri)
        this.semanticModelStorage.deleteSemanticModelFile(languageDocumentUri)
    }

    public getTaskId(task: Task): string | undefined {
        const languageDocumentUri = getDocument(task).textDocument.uri
        return this.get(languageDocumentUri).getTaskIdByName(task.name)
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