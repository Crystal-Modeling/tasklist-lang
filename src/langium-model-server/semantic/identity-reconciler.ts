import type * as src from '../source/model'
import type { LmsDocument } from '../workspace/documents'
import type { SemanticIdentity } from './identity'

export interface IdentityReconciler<SM extends SemanticIdentity, D extends LmsDocument> {
    readonly identityReconciliationIterations: Array<IdentityReconciliationIteration<SM, D>>
}

export type IdentityReconciliationIteration<SM extends SemanticIdentity, D extends LmsDocument>
    = (document: D, update: src.Update<SM>) => void
