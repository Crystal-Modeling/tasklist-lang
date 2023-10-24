import type { LangiumDocument } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity/indexed'
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

        let newName = params.newName
        if (sem.Identified.is(targetNode)) {
            console.debug('Identity for the targetNode:', targetNode.$identity)
            const validatedName = targetNode.$identity.fitNewName(newName)
            if (!validatedName) {
                console.debug('Failed name validation')
                return undefined
            }
            newName = validatedName.result
            console.debug('After name validation, new name is', newName)
            if (!targetNode.$identity.updateName(newName)) {
                console.debug('After updating semantic element, its name has NOT changed')
                return undefined
            }
        }

        return this.textEditService.computeAstNodeRename(targetNode, newName, true)
            .toWorkspaceEdit()
    }

}
