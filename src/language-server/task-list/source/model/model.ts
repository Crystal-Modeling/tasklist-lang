import type { ArrayUpdate, Update } from '../../../../langium-model-server/source/model'
import type { Task } from './task'
import type { Transition } from './transition'

export interface Model {
    id: string
    tasks: Task[]
    transitions: Transition[]
}

export namespace Model {
    export function create(id: string): Model {
        return {
            id,
            tasks: [],
            transitions: []
        }
    }
}

export namespace ModelUpdate {
    export function create(semanticId: string, tasks: ArrayUpdate<Task> = {}): Update<Model> {
        return {
            id: semanticId,
            __nested: {
                tasks,
                transitions: {}
            }
        }
    }
}

// export const mUp: Update<Model> = {
//     id: 'dfsdfsd',
//     // removed: [],
//     __nested: {
//         tasks: {
//             added: [{ id: 'dfsdf', name: 'dsfsdf', content: 'asdfa asdfasd d' }],
//             removedIds: ['sdfsdfs', 'sdfasdfsdf'],
//             changed: [
//                 { id: 'dfsdf', name: 'newName' }
//             ]
//         },
//         transitions: {}
//     }
// }

// export const tUp: Update<Task> = {
//     id: 'dfsdfa'
// }

// export type test = NestedModelsUpdate<Model>
// export type test1 = NestedModelsChanges<Model>
