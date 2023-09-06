
import { Action } from './action'

export type Highlight = Action<'HIGHLIGHTED'>
export namespace Highlight {
    export function create(id: string): Highlight {
        return Action.create(id, 'HIGHLIGHTED')
    }
}
