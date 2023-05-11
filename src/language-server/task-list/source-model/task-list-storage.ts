import * as uuid from 'uuid';
import { URI } from "vscode-uri";
import { AbstractSemanticModelStorage, SemanticModelStorage } from "../../../source-model-server/source-model/semantic-model-storage";
import { SemanticModel } from "./task-list-semantic-model";

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    private semanticModelsByUri: Map<string, SemanticModel> = new Map();

    saveSemanticModel(languageDocumentUri: URI): void {
        console.debug("Saving semantic model...")
        const uri = convertLangiumDocumentUriIntoSourceModelUri(languageDocumentUri).toString()
        const semanticModel = this.semanticModelsByUri.get(uri)
        if (semanticModel)
            this.writeFile(uri, semanticModel)
    }

    loadSemanticModel(languageDocumentUri: URI) {
        console.debug("Loading semantic model for URI", languageDocumentUri)
        const uri = convertLangiumDocumentUriIntoSourceModelUri(languageDocumentUri).toString()
        const semanticModel = this.loadFromFile(uri, SemanticModel.is)
        this.semanticModelsByUri.set(uri, semanticModel)
    }

    protected override createModelForEmptyFile(path: string): SemanticModel {
        const semanticModel: SemanticModel = {
            id: uuid.v4(),
            tasks: {},
            transitions: {}
        }
        return semanticModel
    }
}

function convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
    return uri.with({
        path: uri.path.substring(0, uri.path.lastIndexOf('.tasks')) + '.json'
    });
}