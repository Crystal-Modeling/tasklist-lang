import type { Update } from '../update/update'
import type * as id from '../../../semantic/identity'

export type Highlight = Update<Readonly<id.SemanticIdentity>, 'HIGHLIGHTED'>
export namespace Highlight {
    export function create(id: string): Highlight {
        return {
            id,
            __state: 'HIGHLIGHTED'
        }
    }
}
