import * as uuid from 'uuid'

export type SemanticIdentity = {
    id: string
}

export namespace SemanticIdentity {
    export function generate(): string {
        return uuid.v4()
    }
}

export type ModelUri = {
    readonly modelUri: string
}

export namespace ModelUri {

    export const root = '.'
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

export type SemanticDerivativeName = string[]
export type SemanticPropertyName = string
export type SemanticName = SemanticPropertyName | SemanticDerivativeName

export interface NamedSemanticIdentity extends Readonly<SemanticIdentity>, Readonly<ModelUri> {
    readonly name: SemanticName
}

export interface AstNodeSemanticIdentity extends NamedSemanticIdentity {
    readonly name: SemanticPropertyName
}

export interface DerivativeSemanticIdentity<NAME extends SemanticDerivativeName = SemanticDerivativeName> extends NamedSemanticIdentity {
    readonly name: NAME
}

// FIXME: `Indexed` is not an ideal name, since an object can reach the state when it's no longer belong to `IdentityIndex` (i.e., when it was `delete`d)
export type IndexedIdentity = Indexed<NamedSemanticIdentity>
export type Indexed<ID extends NamedSemanticIdentity> = ID & {
    /**
     * Replaces the `name` value with supplied argument. Returns `true` if update was successful. Returns `true` if the name has changed.
     * @param newName New name to replace the `name` property of this identity.
     * @returns `true` if identity was successfully renamed, or `false` otherwise.
     */
    updateName(newName: ID['name']): boolean
    /**
     * Removes this identity from IdentityIndex it belongs to. Returns `true` if deletion was successful.
     * Subsequent attempts to modify `this` identity will always return false.
     * @returns `true` if identity was successfully deleted, or `false` otherwise.
     */
    delete(): boolean
}
