import * as uuid from 'uuid'

export type SemanticIdentifier = {
    id: string
}

export namespace SemanticIdentifier {
    export function generate(): string {
        return uuid.v4()
    }
}

export type ModelUri = {
    readonly modelUri: string
}

export namespace ModelUri {

    export const root = '/'
    const PROPERTY = '/'
    const ID = '#'

    export function ofSegments(...segments: Segment[]): string {
        return segments.map(s => s.delimiter + s.value).join('')
    }

    export namespace Segment {

        export function property(propertyName: string): Segment {
            return of(PROPERTY, propertyName)
        }

        export function id(idValue: string): Segment {
            return of(ID, idValue)
        }

        function of(delimiter: string, value: string): Segment {
            return { delimiter, value } as Segment
        }
    }

    export type Segment = {
        __brand: 'segment'
        readonly delimiter: string
        readonly value: string
    }
}

export type DerivativeIdentityName = string[]
export type AstNodeIdentityName = string
export type IdentityName = AstNodeIdentityName | DerivativeIdentityName

export type StateRollback = () => void

export interface Identity<NAME extends IdentityName = IdentityName> extends Readonly<SemanticIdentifier>, Readonly<ModelUri> {
    readonly name: NAME
    /**
     * Replaces the `name` value with supplied argument. Returns {@link StateRollback} if the name has changed, which can be used to rollback the operation.
     * If the renaming cannot be performed (e.g., there is already an indexed Identity with name = `newName`), returns `undefined`
     * @param newName New name to replace the `name` property of this identity.
     * @returns {@link StateRollback} if identity was successfully renamed, or `undefined` otherwise.
     */
    updateName(newName: NAME): StateRollback | undefined
    /**
     * Marks this identity as soft-deleted in IndexedIdentity it belongs to. Returns `true` if the state has been changed.
     * Subsequent attempts to modify `this` identity will always return false.
     * @returns `true` if identity was not previously soft-deleted, or `false` otherwise.
     */
    softDelete(): boolean
}

export type AstNodeIdentity = Identity<AstNodeIdentityName>
export type DerivativeSemanticIdentity<NAME extends DerivativeIdentityName = DerivativeIdentityName> = Identity<NAME>
