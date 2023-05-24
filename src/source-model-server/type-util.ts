/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Copied from @eclipse-glsp/protocol/src/utils/type-util.ts
 *
 * Utility type to describe typeguard functions.
 */
export type TypeGuard<T> = (element: any, ...args: any[]) => element is T

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
