import type * as id from '../../../../langium-model-server/semantic/model'
import type { Task } from './task'
import type { Transition } from './transition'

export interface Model {
    id: string
    tasks: Task[]
    transitions: Transition[]
}

export namespace Model {
    export function create(rootModel: id.IdentifiedRoot): Model {
        return {
            id: rootModel.id,
            tasks: [],
            transitions: []
        }
    }
}
