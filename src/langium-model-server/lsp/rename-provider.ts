import type { AstNode, LangiumDocument, ReferenceDescription } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset, getDocument } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import { TextEdit } from 'vscode-languageserver'
import type { AstNodeSemanticIdentity, SemanticIdentity } from '../identity/model'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import type { LangiumModelServerServices } from '../services'
import * as src from '../lms/model'
import type { LmsSubscriptions } from '../lms/subscriptions'
import type { LmsDocument } from '../workspace/documents'
import * as sem from '../semantic/model'

export class LmsRenameProvider<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument> extends DefaultRenameProvider {

    protected identityManager: IdentityManager
    protected lmsSubscriptions: LmsSubscriptions<SM>

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.identityManager = services.identity.IdentityManager
        this.lmsSubscriptions = services.lms.LmsSubscriptions
    }

    override async rename(document: LangiumDocument, params: RenameParams): Promise<WorkspaceEdit | undefined> {
        const changes: Record<string, TextEdit[]> = {}
        const rootNode = document.parseResult.value.$cstNode
        if (!rootNode) return undefined
        const offset = document.textDocument.offsetAt(params.position)
        const leafNode = findDeclarationNodeAtOffset(rootNode, offset, this.grammarConfig.nameRegexp)
        if (!leafNode) return undefined
        const targetNode = this.references.findDeclaration(leafNode)
        if (!targetNode) return undefined

        const options = { onlyLocal: false, includeDeclaration: true }
        const references = this.references.findReferences(targetNode, options)
        const newNameDefinder = this.getNewNameDefiner(targetNode, params)

        if (sem.Identified.is(targetNode)) {
            const targetIdentityIndex = this.identityManager.getIdentityIndex(getDocument(targetNode))
            const targetNodeIdentity = targetNode.identity
            console.debug('Found identity for the targetNode:', targetNodeIdentity)
            if (targetNodeIdentity.updateName(newNameDefinder.targetName)) {
                console.debug('After updating semantic element, its name has changed')
                const rename = src.RootUpdate.createEmpty<AstNodeSemanticIdentity>(targetNodeIdentity.id, targetNodeIdentity.modelUri)
                src.Update.assign(rename, 'name', targetNodeIdentity.name)
                console.debug('Looking for subscriptions for id', targetIdentityIndex.id)
                this.lmsSubscriptions.getSubscription(targetIdentityIndex.id)?.pushUpdate(rename)
            }
        }
        references.forEach(reference => {
            const newName = newNameDefinder.getNameForReference(reference)
            const nodeChange = TextEdit.replace(reference.segment.range, newName)
            const uri = reference.sourceUri.toString()
            if (changes[uri]) {
                changes[uri].push(nodeChange)
            } else {
                changes[uri] = [nodeChange]
            }
        })

        return { changes }
    }

    /**
     * Returns a function, which will be used to define a new name for every given reference to the {@link AstNode} being renamed.
     * Default implementation always returns `params.newName`
     * @param targetNode An {@link AstNode} being renamed
     * @param params The {@link RenameParams} supplied to {@link rename} function
     * @returns a function, that defines a new name for a given reference to a `targetNode`.
     * It may give a different name, e.g., when the element is imported or not (FQN vs simple name)
     */
    protected getNewNameDefiner(targetNode: AstNode, params: RenameParams): NewNameDefiner {
        return {
            getNameForReference: _ref => params.newName,
            targetName: params.newName
        }
    }

}

export interface NewNameDefiner {
    getNameForReference: (referenceDescription: ReferenceDescription) => string
    readonly targetName: string
}
