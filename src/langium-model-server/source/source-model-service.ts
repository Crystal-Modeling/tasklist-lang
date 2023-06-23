import type { LangiumDocument, LangiumDocuments, LanguageMetaData } from 'langium'
import { URI } from 'vscode-uri'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { IdentityManager } from '../semantic/identity-manager'
import type { LangiumModelServerServices } from '../services'
import { UriConverter } from '../utils/uri-converter'
import { LmsDocumentState, type LmsDocument } from '../workspace/documents'
import type * as http2 from 'http2'

export interface SourceModelService<SM> {
    getById(id: string): SM | undefined
    //HACK: I rely on LMS consumers having the file URI almost identical to Langium Document URI
    /**
     * @param sourceUri URI of some **other** file which is 'linked' to the source model file.
     * Currently I assume that only file extension is different from Langium source file extension
     */
    getSemanticId(sourceUri: string): string | undefined
    subscribeToModel(id: string, stream: http2.ServerHttp2Stream): void
}

export abstract class AbstractSourceModelService<SM extends SemanticIdentity, SemI extends IdentityIndex, D extends LmsDocument> implements SourceModelService<SM> {

    protected semanticIndexManager: IdentityManager<SemI>
    protected langiumDocuments: LangiumDocuments
    protected languageMetadata: LanguageMetaData

    constructor(services: LangiumModelServerServices<SM, SemI, D>) {
        this.semanticIndexManager = services.semantic.IdentityManager
        this.langiumDocuments = services.shared.workspace.LangiumDocuments
    }

    public getSemanticId(sourceUri: string): string | undefined {
        const documentUri = UriConverter.of(URI.parse(sourceUri))
            .replaceFileExtensionWith(this.getSourceModelFileExtension())
            .toUri()
        if (!this.langiumDocuments.hasDocument(documentUri)) {
            return undefined
        }
        const langiumDocument = this.langiumDocuments.getOrCreateDocument(documentUri)
        return this.semanticIndexManager.getIdentityIndex(langiumDocument)?.id
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
        if (langiumDocument.state < LmsDocumentState.Identified) {
            return undefined
        }
        const semanticModelIndex = this.semanticIndexManager.getIdentityIndex(langiumDocument)
        if (!semanticModelIndex) {
            return undefined
        }
        return this.combineSemanticModelWithAst(semanticModelIndex, langiumDocument)
    }

    public subscribeToModel(id: string, stream: http2.ServerHttp2Stream): void {
        setTimeout(() => stream.push(JSON.stringify({ msg: 'Here is a Push message :) for id ' + id })), 2_000)
        setTimeout(() => stream.end(JSON.stringify({ msg: 'This is the end' })), 10_000)
    }

    protected getSourceModelFileExtension(): string {
        return this.languageMetadata.fileExtensions[0]
    }

    protected abstract combineSemanticModelWithAst(semanticModelIndex: SemI, langiumDocument: LangiumDocument): SM
}
