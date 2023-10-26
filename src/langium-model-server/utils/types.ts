/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Copied from @eclipse-glsp/protocol/src/utils/type-util.ts
 *
 * Utility type to describe typeguard functions.
 */
export type TypeGuard<T extends O, O = any> = (element: O) => element is T

export namespace TypeGuard {

    export function withProp<C, P extends keyof C, TT extends C[P]>(prop: P, guard: TypeGuard<TT, C[P]>): TypeGuard<C & { [PP in P]: TT }, C> {
        return (obj: C): obj is C & { [PP in P]: TT } => guard(obj[prop] as C[P])
    }
}

export type OmitProperties<T extends K, K> = Omit<T, keyof K>
export type ExcludeExisting<T extends keyof any, K extends T> = Exclude<T, K>
export type Override<T, K extends (keyof T), O> = Omit<T, K> & {
    [P in K]: O
}
export type PickOfTypeAndOverride<R, T, O> = {
    [P in KeysOfType<R, T>]: R[P] extends T ? O : never
}

export function isDefinedObject(obj: unknown): obj is any {
    return !!obj && typeof obj === 'object'
}

export function isMappedObject<T>(obj: unknown, keyType: 'string',
    isValueType: (value: unknown) => value is T): obj is { [k: string]: T }
export function isMappedObject<T>(obj: unknown, keyType: 'number',
    isValueType: (value: unknown) => value is T): obj is { [k: number]: T }
export function isMappedObject<T>(obj: unknown, keyType: 'symbol',
    isValueType: (value: unknown) => value is T): obj is { [k: symbol]: T }
export function isMappedObject<T>(obj: unknown, keyType: 'string' | 'number' | 'symbol',
    isValueType: (value: unknown) => value is T): obj is { [k: string | number | symbol]: T } {

    if (!isDefinedObject(obj)) {
        return false
    }
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            if (typeof key !== keyType || !isValueType(obj[key])) {
                return false
            }
        }
    }
    return true
}

export function isArray<T>(obj: unknown, ofType: TypeGuard<T>): obj is T[] {
    return Array.isArray(obj) && (obj.length === 0 || ofType(obj[0]))
}

export interface ValueBasedOperations<T> {
    stringify: (obj: T) => string
    equal: (right: T, left: T) => boolean
}

export type ModelAttribute = PrimitiveModelAttribute | IterableModelAttribute
export type PrimitiveModelAttribute = string | number | symbol | boolean | bigint
export type IterableModelAttribute = string[] | number[] | symbol[] | boolean[] | bigint[]

export type KeysOfType<T, Type> = {
    [P in keyof T]-?: T[P] extends Type ? P : never
}[keyof T]

export type OptionalKeys<T> = {
    [P in keyof T]-?: undefined extends T[P] ? P : never
}[keyof T]
