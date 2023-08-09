import type { AstNode } from 'langium'
import type { ArtificialAstNode, Identified, AstRootNode } from './model'

export interface SemanticDomain {
    clear(): void
    /**
     * Maps the `rootNode` with semantic ID
     * @param rootNode Am AST Root node of the document
     * @param semanticId Semantic ID, which {@link rootNode} is identified with
     */
    identifyRootNode(rootNode: AstRootNode, semanticId: string): Identified<AstRootNode>
    readonly identifiedRootNode: Identified<AstRootNode> | undefined
    getIdentifiedNode(id: string): Identified<AstNode | ArtificialAstNode> | undefined
}

export type SemanticDomainFactory = () => SemanticDomain
