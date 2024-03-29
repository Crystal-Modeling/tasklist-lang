
import type { AstNode, LangiumDocument, MaybePromise } from 'langium'
import { DefaultDocumentHighlightProvider, findLeafNodeAtOffset, getContainerOfType } from 'langium'
import type { DocumentHighlight, DocumentHighlightParams } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity/indexed'
import type { IdentityManager } from '../identity/manager'
import type { WithSemanticID } from '../identity/semantic-id'
import * as src from '../lms/model'
import type { LmsSubscriptions } from '../lms/subscriptions'
import * as sem from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import type { ExtendableLangiumDocument, LmsDocument } from '../workspace/documents'

export class LmsDocumentHighlightProvider<SM extends WithSemanticID, II extends IdentityIndex, D extends LmsDocument> extends DefaultDocumentHighlightProvider {

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
        const highlightedNodeId = getContainerOfType<sem.Identified<AstNode>>(selectedAstNode, sem.Identified.is)?.$identity.id
        const modelId = this.identityManager.getIdentityIndex(document).id
        if (highlightedNodeId && highlightedNodeId !== this.highlightedNodeIdByModelId.get(modelId)) {
            this.highlightedNodeIdByModelId.set(modelId, highlightedNodeId)
            const highlight = src.Highlight.create(highlightedNodeId)
            this.lmsSubscriptions.getSubscription(modelId)?.pushAction(highlight)
        }
    }
}
