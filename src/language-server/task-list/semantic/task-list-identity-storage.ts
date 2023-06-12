import type { IdentityStorage } from '../../../langium-model-server/semantic/identity-storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/semantic/identity-storage'
import { Model } from './task-list-identity'

export class TaskListIdentityStorage extends AbstractIdentityStorage implements IdentityStorage {

    protected override createIdentityForEmptyFile(): Model {
        return Model.newModel()
    }
}
