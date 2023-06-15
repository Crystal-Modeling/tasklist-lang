import type * as id from '../../semantic/identity'
import type { KeysOfType, ModelAttribute, OptionalKeys } from '../../utils/types'
import type { ArrayUpdate } from './array-update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type Update<T extends id.SemanticIdentity> =
    id.SemanticIdentity & ModelChanges<Omit<T, keyof id.SemanticIdentity>>
export namespace Update {

    export function isEmpty<T extends id.SemanticIdentity>(update: Update<T>): boolean {
        for (const key in update) {
            if (key !== 'id' && key && Object.prototype.hasOwnProperty.call(update, key)) {
                return false
            }
        }
        return true
    }
}

type ModelChanges<T> = ModelAttributeChanges<T> & ModelAttributesDeletion<T> & NestedModelsChanges<T>

type ModelAttributeChanges<T> = {
    [P in KeysOfType<T, ModelAttribute>]?: T[P]
}

type ModelAttributesDeletion<T> = {
    [P in OptionalKeys<T> as `__remove${Capitalize<string & P>}`]?: true
}

type NestedModelsChanges<T> = {
    [P in KeysOfType<T, id.SemanticIdentity[]>]?: T[P] extends id.SemanticIdentity[] ? ArrayUpdate<T[P][0]> : never
}
