import type { Stream } from 'langium'
import type { IdentifiedNode } from './model'

export interface QueriableSemanticDomain {
    readonly rootId: string
    getIdentifiedNodes(): Stream<IdentifiedNode>
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export interface SemanticDomain extends QueriableSemanticDomain {
    clear(): void
}

export type SemanticDomainFactory = (semanticId: string) => SemanticDomain
