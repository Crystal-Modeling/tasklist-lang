
import type { AstNode, LangiumDocument, MaybePromise } from 'langium'
import { DefaultDocumentHighlightProvider, findLeafNodeAtOffset, getContainerOfType } from 'langium'
import type { DocumentHighlight, DocumentHighlightParams } from 'vscode-languageserver'
import type * as identity from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { IdentityManager } from '../semantic/identity-manager'
import * as semantic from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import * as source from '../source/model'
import type { SourceModelSubscriptions } from '../source/source-model-subscriptions'
import type { LmsDocument, SemanticAwareDocument } from '../workspace/documents'

export class LmsDocumentHighlightProvider<SM extends identity.SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> extends DefaultDocumentHighlightProvider {

    private sourceModelSubscriptions: SourceModelSubscriptions
    private identityManager: IdentityManager

    private highlightedNodeIdByModelId: Map<string, string> = new Map()
    private highlightPushingTimeout: NodeJS.Timeout

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
            if (this.highlightPushingTimeout) {
                clearInterval(this.highlightPushingTimeout)
            }
            this.highlightPushingTimeout = setTimeout(() => this.calculateAndPushHighlight(document, selectedCstNode.element), 250)
        }

        return super.getDocumentHighlight(document, params)
    }

    private calculateAndPushHighlight(document: LangiumDocument, selectedAstNode: AstNode) {
        const highlightedNodeId = getContainerOfType(selectedAstNode, semantic.Identified.is)?.id
        const modelId = this.identityManager.getIdentityIndex(document)?.id
        if (modelId && highlightedNodeId && highlightedNodeId !== this.highlightedNodeIdByModelId.get(modelId)) {
            this.highlightedNodeIdByModelId.set(modelId, highlightedNodeId)
            const highlight = source.Highlight.create(highlightedNodeId)
            this.sourceModelSubscriptions.getSubscription(modelId)?.pushHighlight(highlight)
        }
    }
}
