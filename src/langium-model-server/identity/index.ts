import type { RootUpdate } from '../lms/model'
import type { SemanticIdentity } from './model'

export type IdentityIndex<SM extends SemanticIdentity> = {
    readonly id: string
    removeDeletedIdentities(modelUpdate: RootUpdate<SM>): void
}

export type ModelExposedIdentityIndex<SM extends SemanticIdentity, SemI extends IdentityIndex<SM>> = SemI & {
    readonly model: object
}
