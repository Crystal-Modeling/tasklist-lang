
import type { DocumentHighlightParams, DocumentHighlight } from 'vscode-languageserver'
import type * as identity from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerServices } from '../services'
import type { SourceModelSubscriptions } from '../source/source-model-subscriptions'
import type { LmsDocument, SemanticAwareDocument } from '../workspace/documents'
import type { LangiumDocument, MaybePromise } from 'langium'
import { DefaultDocumentHighlightProvider, findLeafNodeAtOffset, getContainerOfType } from 'langium'
import * as semantic from '../semantic/model'
import type { IdentityManager } from '../semantic/identity-manager'
import * as source from '../source/model'

export class LmsDocumentHighlightProvider<SM extends identity.SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> extends DefaultDocumentHighlightProvider {

    private sourceModelSubscriptions: SourceModelSubscriptions
    private identityManager: IdentityManager

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.sourceModelSubscriptions = services.source.SourceModelSubscriptions
        this.identityManager = services.semantic.IdentityManager
    }

    override getDocumentHighlight(document: LangiumDocument & SemanticAwareDocument, params: DocumentHighlightParams): MaybePromise<DocumentHighlight[] | undefined> {
        const rootNode = document.parseResult.value.$cstNode
        if (!rootNode) {
            return undefined
        }
        const selectedCstNode = findLeafNodeAtOffset(rootNode, document.textDocument.offsetAt(params.position))
        if (!selectedCstNode) {
            return undefined
        }

        if (document.semanticDomain) {
            const highlightedNodeId = getContainerOfType(selectedCstNode.element, semantic.Identified.is)?.id
            const modelId = this.identityManager.getIdentityIndex(document)?.id
            if (modelId && highlightedNodeId) {
                const highlight = source.Highlight.create(highlightedNodeId)
                this.sourceModelSubscriptions.getSubscription(modelId)?.pushHighlight(highlight)
            }
        }

        return super.getDocumentHighlight(document, params)
    }
}
