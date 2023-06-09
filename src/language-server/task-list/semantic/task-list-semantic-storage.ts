import type { SemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { AbstractSemanticModelStorage } from '../../../langium-model-server/semantic/semantic-storage'
import { SemanticModel } from './task-list-semantic-model'

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    protected override createModelForEmptyFile(): SemanticModel {
        return SemanticModel.newModel()
    }
}
