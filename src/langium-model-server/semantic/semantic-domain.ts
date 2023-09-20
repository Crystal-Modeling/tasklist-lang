import type { AstRootNode, IdentifiedNode, IdentifiedRoot } from './model'

export interface SemanticDomain {
    clear(): void
    readonly rootId: string
    /**
     * Maps the `rootNode` with semantic ID
     * @param rootNode Am AST Root node of the document
     * @param semanticId Semantic ID, which {@link rootNode} is identified with
     */
    identifyRoot(rootNode: AstRootNode): IdentifiedRoot
    readonly identifiedRoot: IdentifiedRoot | undefined
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export type SemanticDomainFactory = (semanticId: string) => SemanticDomain
