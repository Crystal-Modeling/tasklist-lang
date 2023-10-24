
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
