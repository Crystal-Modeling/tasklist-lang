import type * as id from '../../semantic/identity'
import { ArrayUpdate } from './array-update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type Update<T extends id.SemanticIdentity> =
    id.SemanticIdentity & AttributesUpdate<Omit<T, keyof id.SemanticIdentity>> & NestedModelsUpdate<Omit<T, keyof id.SemanticIdentity>>
export namespace Update {

    export function isEmpty<T extends id.SemanticIdentity>(update: Update<T>): boolean {
        // TODO: You can probably simplify all this stuff by using additional stateful wrapper instead of these compliecated functions
        // __nested is never when there is no nested SourceModels in T.
        // Since __nested must have all the properties initialized (which correspond to nested SourceModels),
        // I cannot check availability of changes merely by checking availability of properties, but instead invoke ArrayUpdate.hasChanges
        if (update.__nested) {
            for (const key in update.__nested) {
                if (Object.prototype.hasOwnProperty.call(update.__nested, key)) {
                    if (ArrayUpdate.hasChanges(key as ArrayUpdate<id.SemanticIdentity>)) {
                        return false
                    }
                }
            }
        }
        for (const key in update) {
            if (key !== 'id' && key !== '__nested' && Object.prototype.hasOwnProperty.call(update, key)) {
                return false
            }
        }
        return true
    }
}

type AttributesUpdate<T> = Partial<ModelAttributeChanges<T> & ModelAttributesDeletion<T>>

// If There is no nested Source Models, then this should return empty object ({})
export type NestedModelsUpdate<T> = NestedModelsChanges<T> extends Record<string, never> ? NestedModelsChanges<T> : {
    __nested: NestedModelsChanges<T>
}

type ModelAttributeChanges<T> = {
    [P in KeysOfType<T, ModelAttribute>]: T[P]
}

type ModelAttributesDeletion<T> = {
    [P in OptionalKeys<T> as `__remove${Capitalize<string & P>}`]: true
}

type NestedModelsChanges<T> = {
    [P in KeysOfType<T, id.SemanticIdentity[]>]: T[P] extends id.SemanticIdentity[] ? ArrayUpdate<T[P][0]> : never
}

type ModelAttribute = string | number | symbol | boolean | bigint | string[] | number[] | symbol[] | boolean[] | bigint[]
// const isModelAttribute = (obj: unknown): obj is ModelAttribute => {
//     const primitiveGuard = (el: unknown): el is string | number | symbol | boolean | bigint => {
//         const elType = typeof obj
//         return elType === 'string' || elType === 'number' || elType === 'symbol' || elType === 'boolean' || elType === 'bigint'
//     }
//     return primitiveGuard(obj) || isArray(obj, primitiveGuard)
// }

type KeysOfType<T, Type> = {
    [P in keyof T]-?: T[P] extends Type ? P : never
}[keyof T]

type OptionalKeys<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]
