import type * as id from '../../../identity/model'
import type { WithSemanticID } from '../../../identity/semantic-id'
import type { KeysOfType, ModelAttribute, OptionalKeys, PrimitiveModelAttribute } from '../../../utils/types'
import type { ArrayUpdate } from './array-update'

/**
 * Describes changes made to SourceModel element of type T
 */
export type Update<T extends WithSemanticID, STATE extends string = never> =
    Partial<id.WithModelUri> &
    Readonly<WithSemanticID> &
    ModelChanges<Omit<T, keyof WithSemanticID | keyof id.WithModelUri>, STATE>

export namespace Update {

    export function isEmpty<T extends WithSemanticID, S extends string>(update: Update<T, S>): boolean {
        const updateRecord = update as Record<string | number | symbol, object>
        for (const key in update) {
            // TODO: Currently I check here also that the value != undefined. However, I think it shouldn't be, since:
            // 1. I strive to only assign values if they changed
            // 2. For optional attributes I designed __removeAttribute properties
            // RECHECK: I wonder, if I can omit comparing to modelUri (if I define it at ModelUpdate, which is an Update child). Perhaps it won't appear at the object prototype?
            if (key !== 'id' && key !== 'modelUri' && Object.prototype.hasOwnProperty.call(update, key) && updateRecord[key] !== undefined) {
                return false
            }
        }
        return true
    }

    export function createEmpty<T extends WithSemanticID, S extends string = never>(id: string): Update<T, S> {
        return <Update<T>>{ id }
    }

    // NOTE: Values taken from AST node can still be evaluated to undefined, even if they are required by type description
    export function assignIfUpdated<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, value: V | undefined, newValue: V | undefined, defaultValue: V): void
    // NOTE: Values taken from an Customized properties should not be undefined, since they are manually initialized
    export function assignIfUpdated<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, value: V, newValue: V): void
    export function assignIfUpdated<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, value: V | undefined, newValue: V | undefined, defaultValue?: V): void {
        if ((newValue ?? defaultValue) !== (value ?? defaultValue)) {
            (update as Record<PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, V>)[key] = newValue ?? defaultValue!
        }
    }

    export function assign<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, newValue: V | undefined, defaultValue: V): void
    export function assign<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, newValue: V): void
    export function assign<T extends WithSemanticID, V extends PrimitiveModelAttribute, S extends string>(update: Update<T, S>,
        key: PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, newValue: V | undefined, defaultValue?: V): void {
        (update as Record<PrimitiveModelAttributeChangesRequiredKeysOfType<T, V>, V>)[key] = newValue ?? defaultValue!
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
    [P in KeysOfType<T, WithSemanticID[]>]?: T[P] extends WithSemanticID[] ? ArrayUpdate<T[P][0]> : never
}

type PrimitiveModelAttributeChangesRequiredKeysOfType<T extends WithSemanticID, V extends PrimitiveModelAttribute> =
    Exclude<KeysOfType<T, V>, keyof WithSemanticID | keyof id.WithModelUri | OptionalKeys<T>>
