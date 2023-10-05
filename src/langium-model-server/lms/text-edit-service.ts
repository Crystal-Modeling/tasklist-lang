import type { AstNode, LangiumServices, ReferenceDescription, References } from 'langium'
import { TextEdit, type WorkspaceEdit } from 'vscode-languageserver'

export interface TextEditService {
    computeAstNodeRename(targetNode: AstNode, newName: string, includeDeclaration: boolean): WorkspaceEdit
}

export class DefaultTextEditService implements TextEditService {

    protected readonly references: References

    constructor(services: LangiumServices) {
        this.references = services.references.References
    }

    public computeAstNodeRename(targetNode: AstNode, newName: string, includeDeclaration: boolean): WorkspaceEdit {
        const references = this.references.findReferences(targetNode, { includeDeclaration, onlyLocal: false })
        if (references.isEmpty()) {
            return {}
        }
        const newNameDefinder = this.getNewNameDefiner(targetNode, newName)
        const changes: Record<string, TextEdit[]> = {}
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
     * @param newName The new name to be assigned to `targetNode`
     * @returns a function, that defines a new name for a given reference to a `targetNode`.
     * It may give a different name, e.g., when the element is imported or not (FQN vs simple name)
     */
    protected getNewNameDefiner(targetNode: AstNode, newName: string): NewNameDefiner {
        return {
            getNameForReference: _ref => newName,
            targetName: newName
        }
    }
}

export interface NewNameDefiner {
    getNameForReference: (referenceDescription: ReferenceDescription) => string
    readonly targetName: string
}
