import type { AstNode, LangiumDocument } from 'langium'
import { DocumentState } from 'langium'
import type { SemanticDomain } from '../semantic/semantic-domain'
import type { Override } from '../utils/types'

export type ExtendableLangiumDocument<T extends AstNode = AstNode> = Override<LangiumDocument<T>, 'state', number>

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export type LmsDocument<T extends AstNode = AstNode> = ExtendableLangiumDocument<T> & SemanticAwareDocument & {
    state: LmsDocumentState
}

export type SemanticAwareDocument = {
    /**
     * This property is initialized during Validation phase to be considered during Identity Reconciliation phase
     */
    semanticDomain?: SemanticDomain
}

/**
 * A document is subject to several phases that are run in predefined order. Any state value implies that
 * smaller state values are finished as well. Used as an extension to Langium `DocumentState`
 */
enum LmsProcessingState {
    /**
     * The `IdentityReconciler` service has processed this document. Each AST node, which plays a role in Source Model
     * is identified with semantic ID
     */
    Identified = 7,
}

export const LmsDocumentState = { ...DocumentState, ...LmsProcessingState }
export type LmsDocumentState = DocumentState | LmsProcessingState
