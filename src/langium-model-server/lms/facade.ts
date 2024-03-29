import { type LangiumDocuments, type LanguageMetaData, type MaybePromise } from 'langium'
import type { Connection } from 'vscode-languageserver'
import { ShowDocumentRequest } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import type { IdentityIndex } from '../identity/indexed'
import type { IdentityManager } from '../identity/manager'
import type { WithSemanticID } from '../identity/semantic-id'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import { UriConverter } from '../utils/uri-converter'
import type { ExtendableLangiumDocument, Initialized } from '../workspace/documents'
import { LmsDocument, LmsDocumentState } from '../workspace/documents'
import type { Creation, CreationParams, Modification, ModificationResult, ValidationMarker } from './model'
import { HighlightResponse } from './model'

export interface LangiumModelServerFacade<SM> {

    readonly addModelHandlersByPathSegment: ReadonlyMap<string, AddModelHandler>
    readonly updateModelHandlersByPathSegment: ReadonlyMap<string, UpdateModelHandler>
    readonly deleteModelHandlersByPathSegment: ReadonlyMap<string, DeleteModelHandler>

    getById(id: string): SM | undefined
    /**
     * @returns `undefined` if unexpected error happened during showing code (opening document and highligting some range)
     */
    highlight(rootModelId: string, id: string): MaybePromise<HighlightResponse>
    validate(rootModelId: string): ValidationMarker[] | undefined
    persist(rootModelId: string): MaybePromise<boolean>
    deleteModels(rootModelId: string, modelIds: string[]): MaybePromise<ModificationResult> | undefined
    //HACK: I rely on LMS consumers having the file URI almost identical to Langium Document URI
    /**
     * @param sourceUri URI of some **other** file which is 'linked' to the source model file.
     * Currently I assume that only file extension is different from Langium source file extension
     */
    getSemanticId(sourceUri: string): string | undefined
}

export interface AddModelHandler<T extends WithSemanticID = WithSemanticID> {
    isApplicable(modelCreation: unknown): boolean
    addModel(rootModelId: string, newModel: Creation<T>, creationParams: CreationParams): MaybePromise<ModificationResult> | undefined
}

export type UpdateModelHandler<T extends WithSemanticID = WithSemanticID> =
    (rootModelId: string, modelId: string, modelUpdate: Modification<T>) => MaybePromise<ModificationResult> | undefined

export type DeleteModelHandler = (rootModelId: string, modelId: string) => MaybePromise<ModificationResult> | undefined

export abstract class AbstractLangiumModelServerFacade<SM extends WithSemanticID, SemI extends IdentityIndex, D extends LmsDocument> implements LangiumModelServerFacade<SM> {

    protected identityManager: IdentityManager<SemI>
    protected langiumDocuments: LangiumDocuments
    protected languageMetadata: LanguageMetaData
    protected isLmsDocument: TypeGuard<D, ExtendableLangiumDocument>
    protected readonly connection: Connection

    readonly addModelHandlersByPathSegment: Map<string, AddModelHandler> = new Map()
    readonly updateModelHandlersByPathSegment: Map<string, UpdateModelHandler> = new Map()
    readonly deleteModelHandlersByPathSegment: Map<string, DeleteModelHandler> = new Map()

    constructor(services: LangiumModelServerServices<SM, SemI, D>) {
        this.identityManager = services.identity.IdentityManager
        this.langiumDocuments = services.shared.workspace.LangiumDocuments
        this.languageMetadata = services.LanguageMetaData
        this.isLmsDocument = services.workspace.LmsDocumentGuard
        this.connection = services.shared.lsp.Connection!
    }

    public getSemanticId(sourceUri: string): string | undefined {
        const documentUri = UriConverter.of(URI.parse(sourceUri))
            .replaceFileExtensionWith(this.getSourceModelFileExtension())
            .toUri()
        if (!this.langiumDocuments.hasDocument(documentUri)) {
            console.debug('Cannot find Langium Document with URI', documentUri.toString())
            return undefined
        }
        const document = this.langiumDocuments.getOrCreateDocument(documentUri)
        if (this.isLmsDocument(document)) {
            return this.identityManager.getIdentityIndex(document).id
        }
        return undefined
    }

    public getById(id: string): SM | undefined {
        const lmsDocument = this.getDocumentById(id)
        if (!lmsDocument) {
            return undefined
        }
        return this.convertSemanticModelToSourceModel(lmsDocument)
    }

    public highlight(rootModelId: string, id: string): MaybePromise<HighlightResponse> {
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return HighlightResponse.notHighlighted(rootModelId)
        }

        if (id === rootModelId) {
            return this.connection.sendRequest(ShowDocumentRequest.type, { uri: lmsDocument.textDocument.uri, takeFocus: true })
                .then(({ success }) => HighlightResponse.documentHighlighted(rootModelId, success))
        }

        const identifiedNode = lmsDocument.semanticDomain.getIdentifiedNode(id)
        if (!identifiedNode) {
            return HighlightResponse.notHighlighted(rootModelId, id)
        }

        return this.connection.sendRequest(ShowDocumentRequest.type,
            { uri: lmsDocument.textDocument.uri, selection: identifiedNode.$cstNode?.range, takeFocus: true }
        ).then(({ success }) => HighlightResponse.modelHighlighted(rootModelId, identifiedNode.$identity.id, success))
    }

    public validate(rootModelId: string): ValidationMarker[] | undefined {
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        return lmsDocument.semanticDomain.getIdentifiedNodes()
            .filter(node => node.$validation.length > 0)
            .flatMap(node => node.$validation
                .map(({ kind, description, label }): ValidationMarker => ({
                    kind, description, label,
                    elementId: node.$identity.id
                }))
            ).toArray()
    }

    public persist(rootModelId: string): MaybePromise<boolean> {
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return Promise.resolve(false)
        }
        const uri = lmsDocument.textDocument.uri
        return this.connection.sendRequest<boolean>('lms/persistModel', uri).then((result) => {
            result ? console.log(`Document saved from Language Server: ${uri}`) : console.warn('Document', uri, 'NOT saved!')
            return result
        }, (error) => {
            console.error(`Error saving document from Language Server: ${error}`)
            return false
        })
    }

    public abstract deleteModels(rootModelId: string, modelIds: string[]): MaybePromise<ModificationResult> | undefined

    protected getSourceModelFileExtension(): string {
        return this.languageMetadata.fileExtensions[0]
    }

    protected abstract convertSemanticModelToSourceModel(lmsDocument: LmsDocument): SM | undefined

    protected getDocumentById(id: string): Initialized<D> | undefined {
        const documentUri = this.identityManager.getLanguageDocumentUri(id)
        // Not sure shouldn't I *create* LangiumDocument if it is not built yet (i.e., if the file has not been loaded)
        if (!documentUri || !this.langiumDocuments.hasDocument(documentUri)) {
            console.debug('Unable to find document')
            return undefined
        }
        // NOTE: Since document URI is known to SemanticIndexManager, this LangiumDocument is LmsDocument
        const document = this.langiumDocuments.getOrCreateDocument(documentUri)
        if (!this.isLmsDocument(document)) {
            throw new Error('Supplied ID is not compatible with LMSDocument type served')
        }
        // TODO: Change this to return Promise, if the document didn't reach the desired state.
        console.debug('Document with id', id, 'has semanticDomain initialized?', !!document.semanticDomain, 'and its state is', document.state)
        if (!LmsDocument.isInitialized(document) || document.state < LmsDocumentState.Identified) {
            return undefined
        }

        return document
    }
}
