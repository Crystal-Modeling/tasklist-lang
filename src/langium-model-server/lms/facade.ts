import type { LangiumDocuments, LanguageMetaData, MaybePromise } from 'langium'
import type { Connection } from 'vscode-languageserver'
import { ShowDocumentRequest } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { IdentityManager } from '../semantic/identity-manager'
import type { LangiumModelServerServices } from '../services'
import { UriConverter } from '../utils/uri-converter'
import { LmsDocumentState, type LmsDocument } from '../workspace/documents'
import { HighlightResponse } from './model'

export interface LangiumModelServerFacade<SM> {
    getById(id: string): SM | undefined
    /**
     * @returns `undefined` if unexpected error happened during showing code (opening document and highligting some range)
     */
    highlight(rootModelId: string, id: string): MaybePromise<HighlightResponse> | undefined
    //HACK: I rely on LMS consumers having the file URI almost identical to Langium Document URI
    /**
     * @param sourceUri URI of some **other** file which is 'linked' to the source model file.
     * Currently I assume that only file extension is different from Langium source file extension
     */
    getSemanticId(sourceUri: string): string | undefined
}

export abstract class AbstractLangiumModelServerFacade<SM extends SemanticIdentity, SemI extends IdentityIndex, D extends LmsDocument>
implements LangiumModelServerFacade<SM> {

    protected semanticIndexManager: IdentityManager<SemI>
    protected langiumDocuments: LangiumDocuments
    protected languageMetadata: LanguageMetaData
    protected readonly connection: Connection | undefined

    constructor(services: LangiumModelServerServices<SM, SemI, D>) {
        this.semanticIndexManager = services.semantic.IdentityManager
        this.langiumDocuments = services.shared.workspace.LangiumDocuments
        this.languageMetadata = services.LanguageMetaData
        this.connection = services.shared.lsp.Connection
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
        const lmsDocument = this.getDocumentById(id)
        if (!lmsDocument) {
            return undefined
        }
        return this.convertSemanticModelToSourceModel(lmsDocument)
    }

    public highlight(rootModelId: string, id: string): MaybePromise<HighlightResponse> | undefined {
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return HighlightResponse.notHighlighted(rootModelId)
        }

        if (id === rootModelId) {
            return this.connection?.sendRequest(ShowDocumentRequest.type, { uri: lmsDocument.textDocument.uri, takeFocus: true })
                .then(({ success }) => HighlightResponse.documentHighlighted(rootModelId, success))
        }

        const identifiedNode = lmsDocument.semanticDomain?.getIdentifiedNode(id)
        if (!identifiedNode) {
            return HighlightResponse.notHighlighted(rootModelId, id)
        }

        return this.connection?.sendRequest(ShowDocumentRequest.type,
            { uri: lmsDocument.textDocument.uri, selection: identifiedNode.$cstNode?.range, takeFocus: true }
        ).then(({ success }) => HighlightResponse.modelHighlighted(rootModelId, identifiedNode.id, success))
    }

    protected getSourceModelFileExtension(): string {
        return this.languageMetadata.fileExtensions[0]
    }

    protected abstract convertSemanticModelToSourceModel(lmsDocument: LmsDocument): SM | undefined

    private getDocumentById(id: string): LmsDocument | undefined {
        const documentUri = this.semanticIndexManager.getLanguageDocumentUri(id)
        // Not sure shouldn't I *create* LangiumDocument if it is not built yet (i.e., if the file has not been loaded)
        if (!documentUri || !this.langiumDocuments.hasDocument(documentUri)) {
            return undefined
        }
        // NOTE: Since document URI is known to SemanticIndexManager, this LangiumDocument is LmsDocument
        const document: LmsDocument = this.langiumDocuments.getOrCreateDocument(documentUri)
        // TODO: Change this to return Promise, if the document didn't reach the desired state.
        if (document.state < LmsDocumentState.Identified) {
            return undefined
        }

        return document
    }
}
