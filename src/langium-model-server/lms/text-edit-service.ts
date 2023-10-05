import type { AstNode, LangiumServices, ReferenceDescription, References } from 'langium'
import type { WorkspaceEdit } from 'vscode-languageserver'
import { TextEdit } from 'vscode-languageserver'
import type { URI } from 'vscode-uri'

export interface TextEditService {
    computeAstNodeRename(targetNode: AstNode, newName: string, includeDeclaration: boolean): SourceEdit
}

export class DefaultTextEditService implements TextEditService {

    protected readonly references: References

    constructor(services: LangiumServices) {
        this.references = services.references.References
    }

    public computeAstNodeRename(targetNode: AstNode, newName: string, includeDeclaration: boolean): SourceEdit {
        const references = this.references.findReferences(targetNode, { includeDeclaration, onlyLocal: false })
        if (references.isEmpty()) {
            return new SourceEdit()
        }
        const newNameDefinder = this.getNewNameDefiner(targetNode, newName)
        const sourceEdit = new SourceEdit()
        references.forEach(reference => {
            const newName = newNameDefinder.getNameForReference(reference)
            const textEdit = TextEdit.replace(reference.segment.range, newName)
            const uri = reference.sourceUri
            sourceEdit.add(uri, textEdit)
        })

        return sourceEdit
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

export class SourceEdit {

    public static ofSingleEdit(uri: URI, textEdit: TextEdit): SourceEdit {
        const sourceEdit = new SourceEdit()
        sourceEdit.add(uri, textEdit)
        return sourceEdit
    }

    public static of(uri: URI, textEdits: TextEdit[]): SourceEdit {
        const sourceEdit = new SourceEdit()
        sourceEdit.changes.set(uri, textEdits)
        return sourceEdit
    }

    private readonly changes: Map<URI, TextEdit[]> = new Map()

    public add(uri: URI, edit: TextEdit) {
        const changesOnUri = this.changes.get(uri)
        if (!changesOnUri) {
            this.changes.set(uri, [edit])
        } else {
            changesOnUri.push(edit)
        }
    }

    public toWorkspaceEdit(): WorkspaceEdit {
        const changes: { [uri: string]: TextEdit[] } = {}
        this.changes.forEach((value, key) => {
            changes[key.toString()] = value
        })
        return {
            changes
        }
    }

    public getAffectedURIs(): IterableIterator<URI> {
        return this.changes.keys()
    }
}
