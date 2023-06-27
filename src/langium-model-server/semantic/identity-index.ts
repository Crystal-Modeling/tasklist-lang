import type { RenameableSemanticIdentity } from './identity'

export type IdentityIndex = {
    readonly id: string
    findElementByName(name: string): RenameableSemanticIdentity | undefined
}

export type ModelExposedIdentityIndex<SemI extends IdentityIndex> = SemI & {
    readonly model: object
}
