import type { SemanticIdentity } from '../../semantic/identity'

/**
 * Describes changes made to SourceModel element of type T. Contains new values for changed primitive attributes
 */
export type Changes<T, U extends SemanticIdentity=SemanticIdentity> = Partial<PrimitiveAttributesOnly<Omit<T, keyof U>>>

export namespace Changes {
    export function areMade(changes: Changes<object>): boolean {
        for (const key in changes) {
            if (Object.prototype.hasOwnProperty.call(changes, key)) {
                return true
            }
        }
        return false
    }
}

type PrimitiveAttributesOnly<T> = {
    [P in KeysOfType<T, string | number | symbol | boolean | bigint>]: T[P]
}

type KeysOfType<T, Type> = {
    [P in keyof T]-?: T[P] extends Type ? P : never
}[keyof T]
