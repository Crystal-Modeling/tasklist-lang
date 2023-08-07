
export type SemanticIdentity = {
    id: string
}

export type DerivativeName = string[]

export type DerivativeNameBuilder<T extends SemanticIdentity, NAME extends DerivativeName> = {
    buildName: (element: T) => NAME
}

export type NamedSemanticIdentity<NAME extends string | DerivativeName> = Readonly<SemanticIdentity> & {
    readonly name: NAME
}

export type RenameableSemanticIdentity<NAME extends string | DerivativeName> = NamedSemanticIdentity<NAME> & {
    /**
     * Replaces the `name` value with supplied argument. If the name changed, returns `true`.
     * Else returns `false`
     * @param newName New name to replace the `name` property of this identity
     */
    updateName(newName: NAME): boolean
}
