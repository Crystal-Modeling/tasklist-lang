import type { AstRootNode, IdentifiedNode, IdentifiedRoot } from './model'

export interface SemanticDomain {
    clear(): void
    /**
     * Maps the `rootNode` with semantic ID
     * @param rootNode Am AST Root node of the document
     * @param semanticId Semantic ID, which {@link rootNode} is identified with
     */
    identifyRootNode(rootNode: AstRootNode, semanticId: string): IdentifiedRoot
    readonly identifiedRootNode: IdentifiedRoot | undefined
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export type SemanticDomainFactory = () => SemanticDomain
