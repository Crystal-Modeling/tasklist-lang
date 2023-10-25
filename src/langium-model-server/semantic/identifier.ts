import type * as id from '../identity/model'
import type { Initialized, LmsDocument } from '../workspace/documents'
import type { UnmappedIdentities } from './model'

export interface Identifier<SM extends id.WithSemanticID, D extends LmsDocument> {
    readonly astIdentificationIterations: Array<AstIdentificationIteration<SM, D>>
}

export type AstIdentificationIteration<SM extends id.WithSemanticID, D extends LmsDocument>
    = (document: Initialized<D>, identitiesDeletion: UnmappedIdentities<SM>) => void
