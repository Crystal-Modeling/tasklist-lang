import type { NamedSemanticElement } from './semantic-model'

export type SemanticIndex = {
    readonly id: string
    findElementByName(name: string): NamedSemanticElement | undefined
}

export type ModelAwareSemanticIndex<SemI extends SemanticIndex> = SemI & {
    readonly model: object
}
