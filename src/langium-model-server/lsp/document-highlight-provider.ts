
import type { AstNode, LangiumDocument, MaybePromise } from 'langium'
import { DefaultDocumentHighlightProvider, findLeafNodeAtOffset, getContainerOfType } from 'langium'
import type { DocumentHighlight, DocumentHighlightParams } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import type * as identity from '../identity/model'
import * as source from '../lms/model'
import type { LmsSubscriptions } from '../lms/subscriptions'
import * as semantic from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import type { ExtendableLangiumDocument } from '../workspace/documents'
import type { LmsDocument } from '../workspace/documents'

export class LmsDocumentHighlightProvider<SM extends identity.SemanticIdentifier, II extends IdentityIndex, D extends LmsDocument> extends DefaultDocumentHighlightProvider {

    private lmsSubscriptions: LmsSubscriptions<SM>
    private identityManager: IdentityManager
    private isLmsDocument: TypeGuard<LmsDocument, ExtendableLangiumDocument>

    private highlightedNodeIdByModelId: Map<string, string> = new Map()
    private highlightPushingTimeout: NodeJS.Timeout

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.lmsSubscriptions = services.lms.LmsSubscriptions
        this.identityManager = services.identity.IdentityManager
        this.isLmsDocument = services.workspace.LmsDocumentGuard
    }

    override getDocumentHighlight(document: LangiumDocument, params: DocumentHighlightParams): MaybePromise<DocumentHighlight[] | undefined> {
        const rootNode = document.parseResult.value.$cstNode
        if (!rootNode) {
            return undefined
        }
        const selectedCstNode = findLeafNodeAtOffset(rootNode, document.textDocument.offsetAt(params.position))
        if (!selectedCstNode) {
            return undefined
        }

        if (this.isLmsDocument(document)) {
            if (this.highlightPushingTimeout) {
                clearInterval(this.highlightPushingTimeout)
            }
            this.highlightPushingTimeout = setTimeout(() => this.calculateAndPushHighlight(document, selectedCstNode.element), 250)
        }

        return super.getDocumentHighlight(document, params)
    }

    private calculateAndPushHighlight(document: LmsDocument, selectedAstNode: AstNode) {
        const highlightedNodeId = getContainerOfType<semantic.Identified<AstNode>>(selectedAstNode, semantic.Identified.is)?.id
        const modelId = this.identityManager.getIdentityIndex(document).id
        if (highlightedNodeId && highlightedNodeId !== this.highlightedNodeIdByModelId.get(modelId)) {
            this.highlightedNodeIdByModelId.set(modelId, highlightedNodeId)
            const highlight = source.Highlight.create(highlightedNodeId)
            this.lmsSubscriptions.getSubscription(modelId)?.pushAction(highlight)
        }
    }
}
