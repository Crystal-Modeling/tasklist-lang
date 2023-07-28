import type { AstNode } from 'langium'
import type { Identified } from './model'

export interface SemanticDomain {
    clear(): void
    getIdentifiedNode(id: string): Identified<AstNode> | undefined
}

export type SemanticDomainFactory = () => SemanticDomain
