import type * as src from '../lms/model'
import type { Initialized, LmsDocument } from '../workspace/documents'
import type { WithSemanticID } from '../identity/model'

export interface IdentityReconciler<SM extends WithSemanticID, D extends LmsDocument> {
    readonly identityReconciliationIterations: Array<IdentityReconciliationIteration<SM, D>>
}

export type IdentityReconciliationIteration<SM extends WithSemanticID, D extends LmsDocument>
    = (document: Initialized<D>, update: src.Update<SM>) => void
