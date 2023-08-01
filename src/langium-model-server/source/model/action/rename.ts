import type { Update } from '../update/update'
import type * as id from '../../../semantic/identity'

export type Rename = Update<id.NamedSemanticIdentity, 'RENAMED'>
export namespace Rename {
    export function create(id: string, name: string): Rename {
        return {
            id,
            name,
            __state: 'RENAMED'
        }
    }
}
