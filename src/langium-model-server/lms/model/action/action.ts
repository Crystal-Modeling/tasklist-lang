import type { WithSemanticID } from '../../../identity/semantic-id'
import type { Update } from '../update/update'

export type Action<S extends string=string> = Update<Readonly<WithSemanticID>, S>
export namespace Action {
    export function create<S extends string>(id: string, state: S): Action<S> {
        return {
            id,
            __state: state
        }
    }
}
