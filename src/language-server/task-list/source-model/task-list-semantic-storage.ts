import { URI } from "vscode-uri";
import { AbstractSemanticModelStorage, SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { TaskListServices } from '../task-list-module';
import { SemanticModel, SemanticModelIndex } from "./task-list-semantic-model";
import { TaskListSemanticModelState } from './task-list-semantic-state';

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    private semanticModelState: TaskListSemanticModelState

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

    protected override createModelForEmptyFile(path: string): SemanticModel {
        return SemanticModel.newModel();
    }
}

function convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
    return uri.with({
        path: uri.path.substring(0, uri.path.lastIndexOf('.tasks')) + '.json'
    });
}

class AccessibleSemanticModelIndex extends SemanticModelIndex {
    
    public override get model(): SemanticModel {
        return this._model
    }
}