import type * as src from '../lms/model'
import type { Initialized, LmsDocument } from '../workspace/documents'
import type { SemanticIdentifier } from '../identity/model'

export interface IdentityReconciler<SM extends SemanticIdentifier, D extends LmsDocument> {
    readonly identityReconciliationIterations: Array<IdentityReconciliationIteration<SM, D>>
}

export type IdentityReconciliationIteration<SM extends SemanticIdentifier, D extends LmsDocument>
    = (document: Initialized<D>, update: src.Update<SM>) => void
