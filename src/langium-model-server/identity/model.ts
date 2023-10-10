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

export interface Identity<NAME extends IdentityName = IdentityName> extends Readonly<SemanticIdentifier>, Readonly<ModelUri> {
    readonly name: NAME
    /**
     * Replaces the `name` value with supplied argument. Returns `true` if update was successful. Returns `true` if the name has changed.
     * @param newName New name to replace the `name` property of this identity.
     * @returns `true` if identity was successfully renamed, or `false` otherwise.
     */
    updateName(newName: NAME): boolean
    /**
     * Removes this identity from IdentityIndex it belongs to. Returns `true` if deletion was successful.
     * Subsequent attempts to modify `this` identity will always return false.
     * @returns `true` if identity was successfully deleted, or `false` otherwise.
     */
    delete(): boolean
}

export type AstNodeIdentity = Identity<AstNodeIdentityName>
export type DerivativeSemanticIdentity<NAME extends DerivativeIdentityName = DerivativeIdentityName> = Identity<NAME>
