import type { IdentifiedNode } from './model'

export interface QueriableSemanticDomain {
    readonly rootId: string
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export interface SemanticDomain extends QueriableSemanticDomain {
    // FIXME: A hack to skip Save action pushing when document saving was initiated externally, to omit endless Save messages exchanging between LMS and GLSP
    // TODO: You need to identify each subscription with client ID, and send client ID with every modifiable REST call. This needs to be stored somewhere!
    persistedExternally: boolean
    clear(): void
}

export type SemanticDomainFactory = (semanticId: string) => SemanticDomain
