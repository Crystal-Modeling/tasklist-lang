import type { AstNode } from 'langium'
import type { ArtificialAstNode, Identified } from './model'

export interface SemanticDomain {
    clear(): void
    getIdentifiedNode(id: string): Identified<AstNode | ArtificialAstNode> | undefined
}

export type SemanticDomainFactory = () => SemanticDomain
