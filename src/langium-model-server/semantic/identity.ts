
export type SemanticIdentity = {
    id: string
}

export type NamedSemanticIdentity = Readonly<SemanticIdentity> & {
    readonly name: string
}

export type RenameableSemanticIdentity = NamedSemanticIdentity & {
    /**
     * Replaces the `name` value with supplied string. If the name changed, returns `true`.
     * Else returns `false`
     * @param newName New name to replace the `name` property of this identity
     */
    updateName(newName: string): boolean
}
