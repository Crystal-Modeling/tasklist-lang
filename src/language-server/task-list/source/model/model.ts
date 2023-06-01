import type { Task } from './task'
import type { Transition } from './transition'

export interface Model {
    id: string
    tasks: Task[]
    transitions: Transition[]
}
