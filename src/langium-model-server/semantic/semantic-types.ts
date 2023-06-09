export type Valid<T> = T & { __semantic: 'valid' }

export type SemanticIndex = {
    readonly id: string
}

export type ModelAwareSemanticIndex<SemI extends SemanticIndex> = SemI & {
    readonly model: object
}
