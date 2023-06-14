import type * as id from '../../semantic/identity'
import type { Update } from './update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type ArrayUpdate<T extends id.SemanticIdentity> = {
    added: T[],
    removedIds: string[],
    changed: Array<Update<T>>
}
