import type { NamedSemanticIdentity } from './identity'

export type IdentityIndex = {
    readonly id: string
    findElementByName(name: string): NamedSemanticIdentity | undefined
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
