import type { LangiumDocument } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset, getDocument } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import type { AstNodeSemanticIdentity, SemanticIdentity } from '../identity/model'
import * as src from '../lms/model'
import type { LmsSubscriptions } from '../lms/subscriptions'
import type { TextEditService } from '../lms/text-edit-service'
import * as sem from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'

export class LmsRenameProvider<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument> extends DefaultRenameProvider {

    protected identityManager: IdentityManager
    protected textEditService: TextEditService
    protected lmsSubscriptions: LmsSubscriptions<SM>

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.identityManager = services.identity.IdentityManager
        this.textEditService = services.lms.TextEditService
        this.lmsSubscriptions = services.lms.LmsSubscriptions
    }

    override async rename(document: LangiumDocument, params: RenameParams): Promise<WorkspaceEdit | undefined> {
        const rootNode = document.parseResult.value.$cstNode
        if (!rootNode) return undefined
        const offset = document.textDocument.offsetAt(params.position)
        const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp)
        if (!leafNode) return undefined
        const targetNode = this.references.findDeclaration(leafNode)
        if (!targetNode) return undefined

        const result = this.textEditService.computeAstNodeRename(targetNode, params.newName, true)
        if (sem.Identified.is(targetNode)) {
            const targetIdentityIndex = this.identityManager.getIdentityIndex(getDocument(targetNode))
            const targetNodeIdentity = targetNode.identity
            console.debug('Found identity for the targetNode:', targetNodeIdentity)
            if (targetNodeIdentity.updateName(params.newName)) {
                console.debug('After updating semantic element, its name has changed')
                const rename = src.RootUpdate.createEmpty<AstNodeSemanticIdentity>(targetNodeIdentity.id, targetNodeIdentity.modelUri)
                src.Update.assign(rename, 'name', targetNodeIdentity.name)
                console.debug('Looking for subscriptions for id', targetIdentityIndex.id)
                this.lmsSubscriptions.getSubscription(targetIdentityIndex.id)?.pushUpdate(rename)
            }
        }

        return result
    }

}
