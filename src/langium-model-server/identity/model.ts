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

export interface DerivativeSemanticIdentity<NAME extends SemanticDerivativeName> extends NamedSemanticIdentity {
    readonly name: NAME
}

export type Renameable<I extends NamedSemanticIdentity> = I & {
    /**
     * Replaces the `name` value with supplied argument. If the name changed, returns `true`.
     * Else returns `false`
     * @param newName New name to replace the `name` property of this identity
     */
    updateName(newName: I['name']): boolean
}
