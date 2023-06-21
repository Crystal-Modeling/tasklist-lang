import type { IdentityStorage } from '../../../langium-model-server/semantic/identity-storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/semantic/identity-storage'
import type { TaskListDocument } from '../workspace/documents'
import { Model } from './task-list-identity'
import type { TaskListIdentityIndex } from './task-list-identity-index'
import type * as source from '../source/model'

export class TaskListIdentityStorage extends AbstractIdentityStorage<source.Model, TaskListIdentityIndex, TaskListDocument> implements IdentityStorage {

    protected override createIdentityForEmptyFile(): Model {
        return Model.newModel()
    }
}
