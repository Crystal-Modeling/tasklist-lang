export type Valid<T> = T & { __semantic: 'valid' }

export type SemanticIndex = {
    readonly id: string
    findElementByName(name: string): NamedSemanticElement | undefined
}

export type ModelAwareSemanticIndex<SemI extends SemanticIndex> = SemI & {
    readonly model: object
}

export type NamedSemanticElement = {
    readonly id: string
    name: string
}
