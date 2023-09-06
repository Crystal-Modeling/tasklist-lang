
export type SemanticIdentity = {
    id: string
}

// TODO: Add SemanticIdentity namespace, that would be in charge of generating new IDs (instead of TaskList Model)

export type SemanticDerivativeName = string[]
export type SemanticPropertyName = string
export type SemanticName = SemanticPropertyName | SemanticDerivativeName

// export type SemanticNameBuilder<T extends SemanticIdentity, NAME extends SemanticName> = {
//     readonly kind: string
//     readonly buildName: (element: T) => NAME
// }

// export class PropertyBasedNameBuilder<T extends NamedSemanticIdentity<SemanticPropertyName>> implements SemanticNameBuilder<T, SemanticPropertyName> {
//     readonly kind: string

//     constructor(key: string) {
//         this.kind = key
//     }

//     public buildName(element: T): SemanticPropertyName {
//         return element.name
//     }
// }

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

export type NamedSemanticIdentity<NAME extends SemanticName> = Readonly<SemanticIdentity> & {
    readonly name: NAME
}

export type RenameableSemanticIdentity<NAME extends SemanticName> = NamedSemanticIdentity<NAME> & ModelUri & {
    /**
     * Replaces the `name` value with supplied argument. If the name changed, returns `true`.
     * Else returns `false`
     * @param newName New name to replace the `name` property of this identity
     */
    updateName(newName: NAME): boolean
}
