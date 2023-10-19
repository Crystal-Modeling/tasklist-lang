import type * as semantic from '../../semantic/model'
import type { Creation } from '../../../../langium-model-server/lms/model'
import { isDefinedObject } from '../../../../langium-model-server/utils/types'

export interface Task {
    id: string
    name: string
    content: string
}

export namespace Task {

    export function create(task: semantic.IdentifiedTask): Task {
        return {
            id: task.id,
            name: task.name,
            content: task.content ?? ''
        }
    }

    export function isNew(obj: unknown): obj is Creation<Task> {
        return isDefinedObject(obj)
            && typeof obj.name === 'string'
            && typeof obj.content === 'string'
    }
}

