import type * as semantic from '../../semantic/model'
import type * as identity from '../../identity/model'
import { Update, type Creation, type ElementUpdate } from '../../../../langium-model-server/lms/model'
import { isDefinedObject } from '../../../../langium-model-server/utils/types'

export interface Task {
    id: string
    name: string
    content: string
}

export namespace Task {

    export function create(task: semantic.IdentifiedTask): Task {
        return {
            id: task.$identity.id,
            name: task.name,
            content: task.content ?? ''
        }
    }

    export function isNew(obj: unknown): obj is Creation<Task> {
        return isDefinedObject(obj)
            && typeof obj.name === 'string'
            && typeof obj.content === 'string'
    }

    export function applyChanges(update: ElementUpdate<Task>, previous: semantic.IdentifiedTask | identity.TaskIdentity, current: semantic.IdentifiedTask): void {
        if (previous !== current.$identity) {
            const previousModel = previous as semantic.IdentifiedTask
            Update.assignIfUpdated(update, 'name', previousModel.name, current.name, '')
            Update.assignIfUpdated(update, 'content', previousModel.content, current.content, '')
        } else {
            console.info(`Can't compare attributes of Task '${current.$identity.id}' with name=${current.name}: previous semantic Task is missing`)
            Update.assign(update, 'name', current.name, '')
            Update.assign(update, 'content', current.content, '')
        }
    }
}
