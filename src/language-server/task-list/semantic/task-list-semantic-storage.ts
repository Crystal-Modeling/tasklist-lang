import type { URI } from 'vscode-uri'
import type { SemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { AbstractSemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { SemanticModel } from './task-list-semantic-model'

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    protected override createModelForEmptyFile(): SemanticModel {
        return SemanticModel.newModel()
    }

    protected override convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
        const folderFileSeparator = uri.path.lastIndexOf('/')
        let semanticPath = uri.path.slice(0, folderFileSeparator) + '/semantic' + uri.path.slice(folderFileSeparator)
        semanticPath = semanticPath.substring(0, semanticPath.lastIndexOf('.tasks')) + '.json'
        console.debug('Semantic path is', semanticPath)
        return uri.with({
            path: semanticPath
        })
    }
}
