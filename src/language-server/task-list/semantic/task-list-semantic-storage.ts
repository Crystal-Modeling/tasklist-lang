import type { URI } from 'vscode-uri'
import type { SemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { AbstractSemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { SemanticModel } from './task-list-semantic-model'
import { UriConverter } from '../../../langium-model-server/utils/uri-converter'

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    protected override createModelForEmptyFile(): SemanticModel {
        return SemanticModel.newModel()
    }

    protected override convertLangiumDocumentUriIntoSourceModelUri(uri: URI): URI {
        return UriConverter.of(uri)
            .putFileInSubFolder('semantic')
            .replaceFileExtension('.json')
            .apply((_, path) => console.debug('Semantic path is', path))
            .toUri()
    }
}
