import { getDocument } from 'langium'
import { URI } from 'vscode-uri'
import type { SemanticIndexManager } from '../../../langium-model-server/semantic/semantic-manager'
import type { SemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import type { Task } from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import type { TaskListDocument } from '../workspace/documents'
import { SemanticModel } from './task-list-semantic-model'
import { SemanticModelIndex } from './task-list-semantic-model-index'

/**
 * Stores {@link SemanticModel} per URI of Langium-managed TextDocument.
 * It has control over all {@link SemanticModelIndex}es existing. Therefore, it is a point of contact
 * to fetch semantic elements globally, i.e., searching through all the managed files.
 * See {@link getTaskId} for example.
 */
export class TaskListSemanticIndexManager implements SemanticIndexManager<SemanticModelIndex> {

    private semanticModelStorage: SemanticModelStorage
    private indexRegistryByLanguageDocumentUri: Map<string, AccessibleSemanticModelIndex>
    private languageDocumentUriById: Map<string, URI>

    public constructor(services: TaskListServices) {
        this.semanticModelStorage = services.semantic.SemanticModelStorage
        this.indexRegistryByLanguageDocumentUri = new Map()
        this.languageDocumentUriById = new Map()
    }

    public getTaskId(task: Task): string | undefined {
        return this.getSemanticModelIndex(getDocument(task)).getTaskIdByName(task.name)
    }

    /*
        OVERRIDING FUNCTIONS SECTION
    */

    public getLanguageDocumentUri(id: string): URI | undefined {
        return this.languageDocumentUriById.get(id)
    }

    public getSemanticModelIndex(languageDocument: TaskListDocument): SemanticModelIndex {
        return this.getOrLoadSemanticModel(languageDocument.textDocument.uri)
    }

    public loadSemanticModel(languageDocumentUri: string): void {
        console.debug('Loading semantic model for URI', languageDocumentUri)
        const semanticModel = this.semanticModelStorage.loadSemanticModelFromFile(languageDocumentUri, SemanticModel.is)
        const semanticModelIndex = new AccessibleSemanticModelIndex(semanticModel)
        this.languageDocumentUriById.set(semanticModel.id, URI.parse(languageDocumentUri))
        this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, semanticModelIndex)
    }

    public saveSemanticModel(languageDocumentUri: string): void {
        console.debug('Saving semantic model...')
        const semanticModel = this.getOrLoadSemanticModel(languageDocumentUri).model
        this.semanticModelStorage.saveSemanticModelToFile(languageDocumentUri, semanticModel)
    }

    public deleteSemanticModel(languageDocumentUri: string): void {
        console.debug('Deleting semantic model for URI', languageDocumentUri)
        const existingModelIndex = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (existingModelIndex) {
            this.indexRegistryByLanguageDocumentUri.delete(languageDocumentUri)
            this.languageDocumentUriById.delete(existingModelIndex.model.id)
        }
        this.semanticModelStorage.deleteSemanticModelFile(languageDocumentUri)
    }

    private getOrLoadSemanticModel(languageDocumentUri: string): AccessibleSemanticModelIndex {
        const loadedSemanticModel = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (loadedSemanticModel) {
            return loadedSemanticModel
        }
        this.loadSemanticModel(languageDocumentUri)
        return this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)!
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
