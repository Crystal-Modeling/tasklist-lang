import type { TaskListIdentityIndex } from './identity-index'
import * as id from '../../../langium-model-server/identity/model'
import type { IdentityStorage } from '../../../langium-model-server/identity/storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/identity/storage'
import { isArray, isDefinedObject } from '../../../langium-model-server/utils/types'
import type * as source from '../lms/model'
import type { TaskListDocument } from '../workspace/documents'
import { TransitionName } from './model'

export class TaskListIdentityStorage extends AbstractIdentityStorage<source.Model, TaskListIdentityIndex, TaskListDocument> implements IdentityStorage {

    protected override createIdentityForEmptyFile(): ModelIdentityModel {
        return {
            id: id.SemanticID.generate(),
            tasks: [],
            transitions: []
        }
    }
}

export interface ModelIdentityModel {
    id: string
    tasks: id.AstNodeIdentityModel[]
    transitions: Array<id.DerivativeIdentityModel<TransitionName>>
}

export namespace ModelIdentityModel {
    export function is(obj: unknown): obj is ModelIdentityModel {
        if (!isDefinedObject(obj)) {
            return false
        }
        if (typeof obj.id !== 'string'
            || !isArray(obj.tasks, id.IdentityModel.is)
            || !isArray(obj.transitions, (m): m is id.IdentityModel<TransitionName> => id.IdentityModel.is(m, TransitionName.is))) {
            return false
        }

        return true
    }
}
