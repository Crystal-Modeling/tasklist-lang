import type * as id from '../../semantic/identity'
import type { ArrayUpdate } from './array-update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type Update<T extends id.SemanticIdentity> =
    id.SemanticIdentity & Partial<AttributeAndNestedModelsUpdate<Omit<T, keyof id.SemanticIdentity>>>

export namespace Update {

    export function isEmpty<T extends id.SemanticIdentity>(update: Update<T>): boolean {
        for (const key in update) {
            if (key !== 'id' && Object.prototype.hasOwnProperty.call(update, key)) {
                return false
            }
        }
        return true
    }
}

type AttributeAndNestedModelsUpdate<T> = ModelAttributeChanges<T> & ModelAttributesDeletion<T> & NestedModelsUpdate<T>

type ModelAttributeChanges<T> = {
    [P in KeysOfType<T, ModelAttribute>]: T[P]
}

type ModelAttributesDeletion<T> = {
    [P in OptionalKeys<T> as `__remove${Capitalize<string & P>}`]: true
}

type NestedModelsUpdate<T> = {
    [P in KeysOfType<T, id.SemanticIdentity[]>]: T[P] extends id.SemanticIdentity[] ? ArrayUpdate<T[P][0]> : never
}

type ModelAttribute = string | number | symbol | boolean | bigint | string[] | number[] | symbol[] | boolean[] | bigint[]

type KeysOfType<T, Type> = {
    [P in keyof T]-?: T[P] extends Type ? P : never
}[keyof T]

type OptionalKeys<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]
