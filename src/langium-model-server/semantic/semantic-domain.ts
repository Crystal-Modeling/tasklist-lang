import type { IdentifiedNode } from './model'

export interface QueriableSemanticDomain {
    readonly rootId: string
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export interface SemanticDomain extends QueriableSemanticDomain {
    clear(): void
}

export type SemanticDomainFactory = (semanticId: string) => SemanticDomain
