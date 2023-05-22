import { URI } from "vscode-uri";
import { AbstractSemanticModelStorage, SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { TaskListServices } from '../task-list-module';
import { SemanticModel, SemanticModelIndex } from "./task-list-semantic-model";
import { TaskListSemanticIndexManager } from './task-list-semantic-manager';

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    private semanticModelState: TaskListSemanticIndexManager

    public constructor(services: TaskListServices) {
        super()
        this.semanticModelState = services.sourceModel.TaskListSemanticModelState
    }

    saveSemanticModel(languageDocumentUri: string): void {
        console.debug("Saving semantic model...")
        const uri = convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        const semanticModel = (this.semanticModelState.get(languageDocumentUri) as AccessibleSemanticModelIndex).model
        this.writeFile(uri, semanticModel)
    }

    loadSemanticModel(languageDocumentUri: string): void {
        console.debug("Loading semantic model for URI", languageDocumentUri)
        const uri = convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        const semanticModel = this.loadFromFile(uri, SemanticModel.is)
        this.semanticModelState.set(languageDocumentUri, new AccessibleSemanticModelIndex(semanticModel))
    }
    
    deleteSemanticModel(languageDocumentUri: string): void {
        console.debug("Deleting semantic model for URI", languageDocumentUri)
        const uri = convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        this.semanticModelState.delete(languageDocumentUri)
        this.deleteFile(uri)
    }

    protected override createModelForEmptyFile(path: string): SemanticModel {
        return SemanticModel.newModel();
    }
}

function convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
    const folderFileSeparator = uri.path.lastIndexOf('/')
    const semanticPath = uri.path.slice(0, folderFileSeparator) + '/semantic' + uri.path.slice(folderFileSeparator)
    console.debug("Semantic path is", semanticPath)
    return uri.with({
        path: semanticPath.substring(0, semanticPath.lastIndexOf('.tasks')) + '.json'
    });
}

class AccessibleSemanticModelIndex extends SemanticModelIndex {
    
    public override get model(): SemanticModel {
        return this._model
    }
}