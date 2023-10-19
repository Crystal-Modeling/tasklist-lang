import type { Task } from './task'
import type { Transition } from './transition'

export interface Model {
    id: string
    tasks: Task[]
    transitions: Transition[]
}

export namespace Model {
    export function createEmpty(rootId: string): Model {
        return {
            id: rootId,
            tasks: [],
            transitions: []
        }
    }
}
