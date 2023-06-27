
export type SemanticIdentity = {
    id: string
}

export type NamedSemanticIdentity = Readonly<SemanticIdentity> & {
    name: string
}
