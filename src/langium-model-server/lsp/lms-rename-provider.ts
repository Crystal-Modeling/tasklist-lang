import type { AstNode, LangiumDocument, ReferenceDescription } from 'langium'
import { DefaultRenameProvider, findDeclarationNodeAtOffset } from 'langium'
import type { RenameParams, WorkspaceEdit } from 'vscode-languageserver'
import { TextEdit } from 'vscode-languageserver'
import type { SemanticIndexManager } from '../semantic/semantic-manager'
import type { LangiumModelServerServices } from '../langium-model-server-module'

export class LmsRenameProvider extends DefaultRenameProvider {

    protected semanticIndexManager: SemanticIndexManager

    constructor(services: LangiumModelServerServices) {
        super(services)
        this.semanticIndexManager = services.semantic.SemanticIndexManager
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

        const newName = newNameDefinder.newTargetName
        this.semanticIndexManager.updateNodeName(targetNode, newName)
        references.forEach(reference => {
            const newName = newNameDefinder.getNewNameForReference(reference)
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
            getNewNameForReference: _ => params.newName,
            newTargetName: params.newName
        }
    }

}

export interface NewNameDefiner {
    getNewNameForReference: (referenceDescription: ReferenceDescription) => string
    readonly newTargetName: string
}