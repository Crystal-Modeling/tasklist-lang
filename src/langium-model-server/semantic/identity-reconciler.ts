import type * as src from '../source/model'
import type { LmsDocument } from '../workspace/documents'
import type { SemanticIdentity } from './identity'

export interface IdentityReconciler<SM extends SemanticIdentity = SemanticIdentity> {
    reconcileIdentityWithLanguageModel(document: LmsDocument): src.Update<SM>
}
