import type * as id from '../../semantic/identity'
import type { KeysOfType, ModelAttribute, OptionalKeys } from '../../utils/types'
import type { ArrayUpdate } from './array-update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type Update<T extends id.SemanticIdentity, STATE extends string = never> =
    id.SemanticIdentity & ModelChanges<Omit<T, keyof id.SemanticIdentity>, STATE>
export namespace Update {

    export function isEmpty<T extends id.SemanticIdentity, S extends string>(update: Update<T, S>): boolean {
        for (const key in update) {
            if (key !== 'id' && key && Object.prototype.hasOwnProperty.call(update, key)) {
                return false
            }
        }
        return true
    }

    export function createEmpty<T extends id.SemanticIdentity>(id: string): Update<T> {
        return <Update<T>>{ id }
    }
}

type ModelChanges<T, STATE extends string> = ModelAttributeChanges<T> & ModelStateChanges<STATE> & ModelAttributesDeletion<T> & NestedModelsChanges<T>

type ModelAttributeChanges<T> = {
    [P in KeysOfType<T, ModelAttribute>]?: T[P]
}

type ModelStateChanges<T extends string> = {
    '__state'?: T
}

type ModelAttributesDeletion<T> = {
    [P in OptionalKeys<T> as `__remove${Capitalize<string & P>}`]?: true
}

type NestedModelsChanges<T> = {
    [P in KeysOfType<T, id.SemanticIdentity[]>]?: T[P] extends id.SemanticIdentity[] ? ArrayUpdate<T[P][0]> : never
}
