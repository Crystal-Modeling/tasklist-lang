import { getDocument } from 'langium'
import type { SemanticIndexManager } from '../../../langium-model-server/semantic/semantic-manager'
import type { SemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import type { Task } from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import { SemanticModel, SemanticModelIndex } from './task-list-semantic-model'

/**
 * Stores {@link SemanticModel} per URI of Langium-managed TextDocument.
 * It has control over all {@link SemanticModelIndex}es existing. Therefore, it is a point of contact
 * to fetch semantic elements globally, i.e., searching through all the managed files.
 * See {@link getTaskId} for example.
 */
export class TaskListSemanticIndexManager extends Map<string, SemanticModelIndex> implements SemanticIndexManager {

    private semanticModelStorage: SemanticModelStorage

    public constructor(services: TaskListServices) {
        super()
        this.semanticModelStorage = services.semantic.SemanticModelStorage
    }

    public getTaskId(task: Task): string | undefined {
        const languageDocumentUri = getDocument(task).textDocument.uri
        return this.get(languageDocumentUri).getTaskIdByName(task.name)
    }

    public loadSemanticModel(languageDocumentUri: string): void {
        console.debug('Loading semantic model for URI', languageDocumentUri)
        const semanticModel = this.semanticModelStorage.loadSemanticModelFromFile(languageDocumentUri, SemanticModel.is)
        this.set(languageDocumentUri, new AccessibleSemanticModelIndex(semanticModel))
    }

    public saveSemanticModel(languageDocumentUri: string): void {
        console.debug('Saving semantic model...')
        const semanticModel = (this.get(languageDocumentUri) as AccessibleSemanticModelIndex).model
        this.semanticModelStorage.saveSemanticModelToFile(languageDocumentUri, semanticModel)
    }

    public deleteSemanticModel(languageDocumentUri: string): void {
        console.debug('Deleting semantic model for URI', languageDocumentUri)
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

/**
 * Hidden class with the only purpose to reveal {@link SemanticModel}
 * wrapped with {@link SemanticModelIndex} to persist it to the file
 * by {@link SemanticModelStorage}.
 *
 * Since {@link SemanticIndexManager} is the only one who persists
 * and removes {@link SemanticModelIndex} from its registry, it is
 * also the only one who is aware of a particular
 * {@link SemanticModelIndex} implementation
 */
class AccessibleSemanticModelIndex extends SemanticModelIndex {

    public override get model(): SemanticModel {
        return this._model
    }
}
