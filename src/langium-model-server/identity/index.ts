
export type IdentityIndex = {
    readonly id: string
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
