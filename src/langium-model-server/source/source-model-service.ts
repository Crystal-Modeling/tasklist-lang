import type { LangiumDocument, LangiumDocuments } from 'langium'
import { DocumentState } from 'langium'
import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../langium-model-server-module'
import type { SemanticIndexManager } from '../semantic/semantic-manager'
import type { SemanticIndex } from '../semantic/semantic-types'
import { UriConverter } from '../utils/uri-converter'

export interface SourceModelService<SM> {
    getById(id: string): SM | undefined
    //HACK: I rely on LMS consumers having the file URI almost identical to Langium Document URI
    /**
     * @param sourceUri URI of some **other** file which is 'linked' to the source model file.
     * Currently I assume that only file extension is different from Langium source file extension
     */
    getSemanticId(sourceUri: string): string | undefined
}

export abstract class DefaultSourceModelService<SM, SemI extends SemanticIndex> implements SourceModelService<SM> {

    protected semanticIndexManager: SemanticIndexManager<SemI>
    protected langiumDocuments: LangiumDocuments

    constructor(services: LangiumModelServerServices<SM, SemI>) {
        this.semanticIndexManager = services.semantic.SemanticIndexManager
        this.langiumDocuments = services.shared.workspace.LangiumDocuments
    }

    getSemanticId(sourceUri: string): string | undefined {
        const documentUri = UriConverter.of(URI.parse(sourceUri))
            .replaceFileExtension(this.getSourceModelFileExtension())
            .toUri()
        if (!this.langiumDocuments.hasDocument(documentUri)) {
            return undefined
        }
        const langiumDocument = this.langiumDocuments.getOrCreateDocument(documentUri)
        return this.semanticIndexManager.getSemanticModelIndex(langiumDocument)?.id
    }

    public getById(id: string): SM | undefined {
        const documentUri = this.semanticIndexManager.getLanguageDocumentUri(id)
        if (!documentUri) {
            return undefined
        }
        if (!this.langiumDocuments.hasDocument(documentUri)) {
            return undefined
        }
        const langiumDocument = this.langiumDocuments.getOrCreateDocument(documentUri)
        //TODO: Change this to return Promise, if the document didn't reach the desired state.
        // Also override DocumentBuilder, to augument new final state (SemanticModelReconciled)
        if (langiumDocument.state !== DocumentState.Validated) {
            return undefined
        }
        const semanticModelIndex = this.semanticIndexManager.getSemanticModelIndex(langiumDocument)
        if (!semanticModelIndex) {
            return undefined
        }
        return this.combineSemanticModelWithAst(semanticModelIndex, langiumDocument)
    }

    protected abstract getSourceModelFileExtension(): string
    protected abstract combineSemanticModelWithAst(semanticModelIndex: SemI, langiumDocument: LangiumDocument): SM
}
