import type { IdentityStorage } from '../../../langium-model-server/identity/storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/identity/storage'
import type { TaskListDocument } from '../workspace/documents'
import { Model } from './model'
import type { TaskListIdentityIndex } from '.'
import type * as source from '../lms/model'

export class TaskListIdentityStorage extends AbstractIdentityStorage<source.Model, TaskListIdentityIndex, TaskListDocument> implements IdentityStorage {

    protected override createIdentityForEmptyFile(): Model {
        return Model.newModel()
    }
}
