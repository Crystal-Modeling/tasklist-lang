import type { LangiumDocument } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import type { SemanticIdentifier } from '../identity/model'
import type { TextEditService } from '../lms/text-edit-service'
import * as sem from '../semantic/model'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'

export class LmsRenameProvider<SM extends SemanticIdentifier, II extends IdentityIndex, D extends LmsDocument> extends DefaultRenameProvider {

    protected identityManager: IdentityManager
    protected textEditService: TextEditService

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.identityManager = services.identity.IdentityManager
        this.textEditService = services.lms.TextEditService
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
            const targetNodeIdentity = targetNode.identity
            console.debug('Found identity for the targetNode:', targetNodeIdentity)
            if (targetNodeIdentity.updateName(params.newName)) {
                console.debug('After updating semantic element, its name has changed')
            }
        }

        return result.toWorkspaceEdit()
    }

}
