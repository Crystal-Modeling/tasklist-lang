import type { AstNode, Properties } from 'langium'
import type { ArtificialAstNode, IdentifiedNode, Valid } from './model'

export interface QueriableSemanticDomain {
    readonly rootId: string
    /**
     * Checks if the LMS model contain submodel derived from the arguments:
     * - Either semantically valid {@link ArtificialAstNode}, based on the reference located by `node`.`property`[`index`]),
     * - Or (if `property` is undefined) semantically valid {@link AstNode} (is `node` semantically valid)
     * @param node An ${@link AstNode}, that will be checked for the semantical validity
     * @param property `node`'s property. If present, it will be used first to look for semantically valid {@link ArtificialAstNode} based on its value
     * @param index In case of a multi-value property (array), an index should be given to select a specific element.
     * @returns `undefined` if `node`.`property`[`index`] or `node` is not part of the LMS model, or if it is not semantically valid
     */
    getValidNode<N extends AstNode, P = Properties<N>>(node: N, property?: P, index?: number): Valid<AstNode | ArtificialAstNode> | undefined
    getIdentifiedNode(id: string): IdentifiedNode | undefined
}

export interface SemanticDomain extends QueriableSemanticDomain {
    clear(): void
}

export type SemanticDomainFactory = (semanticId: string) => SemanticDomain
