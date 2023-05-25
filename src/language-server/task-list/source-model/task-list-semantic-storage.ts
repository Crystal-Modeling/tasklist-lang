import type { URI } from 'vscode-uri'
import type { SemanticModelStorage } from '../../../source-model-server/source-model/semantic-storage'
import { AbstractSemanticModelStorage } from '../../../source-model-server/source-model/semantic-storage'
import { SemanticModel } from './task-list-semantic-model'

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    protected override createModelForEmptyFile(): SemanticModel {
        return SemanticModel.newModel()
    }

    protected override convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
        const folderFileSeparator = uri.path.lastIndexOf('/')
        const semanticPath = uri.path.slice(0, folderFileSeparator) + '/semantic' + uri.path.slice(folderFileSeparator)
        console.debug('Semantic path is', semanticPath)
        return uri.with({
            path: semanticPath.substring(0, semanticPath.lastIndexOf('.tasks')) + '.json'
        })
    }
}
