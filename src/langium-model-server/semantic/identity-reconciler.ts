import type * as src from '../lms/model'
import type { Initialized, LmsDocument } from '../workspace/documents'
import type { SemanticIdentity } from './identity'

export interface IdentityReconciler<SM extends SemanticIdentity, D extends LmsDocument> {
    readonly identityReconciliationIterations: Array<IdentityReconciliationIteration<SM, D>>
}

export type IdentityReconciliationIteration<SM extends SemanticIdentity, D extends LmsDocument>
    = (document: Initialized<D>, update: src.Update<SM>) => void
