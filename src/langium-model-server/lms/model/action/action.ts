import type { Update } from '../update/update'
import type * as id from '../../../identity/model'

export type Action<S extends string=string> = Update<Readonly<id.SemanticIdentity>, S>
export namespace Action {
    export function create<S extends string>(id: string, state: S): Action<S> {
        return {
            id,
            __state: state
        }
    }
}
