
import { Action } from './action'

export type Save = Action<'SAVED'>
export namespace Save {
    export function create(id: string): Save {
        return Action.create(id, 'SAVED')
    }
}
