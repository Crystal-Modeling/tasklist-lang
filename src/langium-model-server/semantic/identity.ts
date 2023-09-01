
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

    export function nested(...segments: Segment[]): string {
        return root + segments.join('')
    }

    export namespace Segment {

        export function property(propertyName: string): Segment {
            return ofValue('/' + propertyName)
        }

        export function id(id: string): Segment {
            return ofValue('#' + id)
        }

        function ofValue(value: string): Segment {
            return value as Segment
        }
    }

    export type Segment = string & {
        __brand: 'segment'
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
