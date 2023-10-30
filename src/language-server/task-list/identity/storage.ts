import { IdentityData, type AstNodeIdentityData, type DerivativeIdentityData } from '../../../langium-model-server/identity/identity-data'
import { SemanticID } from '../../../langium-model-server/identity/semantic-id'
import type { IdentityStorage } from '../../../langium-model-server/identity/storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/identity/storage'
import { isArray, isDefinedObject } from '../../../langium-model-server/utils/types'
import type * as source from '../lms/model'
import type { TaskListDocument } from '../workspace/documents'
import type { TaskListIdentityIndex } from './indexed'
import { TransitionName } from './model'

export class TaskListIdentityStorage extends AbstractIdentityStorage<source.Model, TaskListIdentityIndex, TaskListDocument> implements IdentityStorage {

    protected override createIdentityForEmptyFile(): ModelIdentityModel {
        return {
            id: SemanticID.generate(),
            tasks: [],
            transitions: []
        }
    }
}

export interface ModelIdentityModel {
    id: string
    tasks: AstNodeIdentityData[]
    transitions: Array<DerivativeIdentityData<TransitionName>>
}

export namespace ModelIdentityModel {
    export function is(obj: unknown): obj is ModelIdentityModel {
        if (!isDefinedObject(obj)) {
            return false
        }
        if (typeof (obj as ModelIdentityModel).id !== 'string'
            || !isArray((obj as ModelIdentityModel).tasks, IdentityData.is)
            || !isArray((obj as ModelIdentityModel).transitions, (m): m is IdentityData<TransitionName> => IdentityData.is(m, TransitionName.is))) {
            return false
        }

        return true
    }
}
