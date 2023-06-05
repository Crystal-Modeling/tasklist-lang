export type Valid<T> = T & { __semantic: 'valid' }

export type SemanticIndex = {
    readonly id: string
}
