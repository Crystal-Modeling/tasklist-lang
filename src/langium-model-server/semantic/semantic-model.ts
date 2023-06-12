export type SemanticIdentity = {
    id: string
}

export type Valid<T> = T & { __semantic: 'valid' }
export type Identified<T> = Valid<T> & SemanticIdentity

export type NamedSemanticElement = Readonly<SemanticIdentity> & {
    name: string
}
