
import type { AstNode, LangiumDocument, MaybePromise } from 'langium'
import { DefaultDocumentHighlightProvider, findLeafNodeAtOffset, getContainerOfType } from 'langium'
import type { DocumentHighlight, DocumentHighlightParams } from 'vscode-languageserver'
import type * as identity from '../identity/model'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import * as semantic from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import * as source from '../lms/model'
import type { LmsSubscriptions } from '../lms/subscriptions'
import type { LmsDocument, SemanticAwareDocument } from '../workspace/documents'

export class LmsDocumentHighlightProvider<SM extends identity.SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument> extends DefaultDocumentHighlightProvider {

    private lmsSubscriptions: LmsSubscriptions<SM>
    private identityManager: IdentityManager

    private highlightedNodeIdByModelId: Map<string, string> = new Map()
    private highlightPushingTimeout: NodeJS.Timeout

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.lmsSubscriptions = services.lms.LmsSubscriptions
        this.identityManager = services.identity.IdentityManager
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
        const modelId = this.identityManager.getIdentityIndex(document).id
        if (highlightedNodeId && highlightedNodeId !== this.highlightedNodeIdByModelId.get(modelId)) {
            this.highlightedNodeIdByModelId.set(modelId, highlightedNodeId)
            const highlight = source.Highlight.create(highlightedNodeId)
            this.lmsSubscriptions.getSubscription(modelId)?.pushAction(highlight)
        }
    }
}
