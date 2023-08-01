import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { SemanticIdentity } from './identity'
import type { IdentityIndex, ModelExposedIdentityIndex } from './identity-index'
import type { IdentityStorage } from './identity-storage'

export interface IdentityManager<II extends IdentityIndex = IdentityIndex> {
    getLanguageDocumentUri(id: string): URI | undefined
    getIdentityIndex(langiumDocument: LmsDocument): II | undefined
    saveSemanticIdentity(languageDocumentUri: string): void
    loadSemanticIdentity(languageDocumentUri: string): void
    deleteSemanticIdentity(languageDocumentUri: string): void
    renameSemanticIdentity(oldLanguageUri: string, newLanguageUri: string): void
}

export abstract class AbstractIdentityManager<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> implements IdentityManager<II> {

    protected identityStorage: IdentityStorage
    private indexRegistryByLanguageDocumentUri: Map<string, ModelExposedIdentityIndex<II>>
    private languageDocumentUriById: Map<string, URI>

    public constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.identityStorage = services.semantic.IdentityStorage
        this.indexRegistryByLanguageDocumentUri = new Map()
        this.languageDocumentUriById = new Map()
    }

    public getLanguageDocumentUri(id: string): URI | undefined {
        return this.languageDocumentUriById.get(id)
    }

    public getIdentityIndex(languageDocument: LmsDocument): II {
        return this.getOrLoadIdentity(languageDocument.textDocument.uri)
    }

    public loadSemanticIdentity(languageDocumentUri: string): void {
        const identityIndex = this.loadIdentityToIndex(languageDocumentUri)
        this.languageDocumentUriById.set(identityIndex.id, URI.parse(languageDocumentUri))
        this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, identityIndex)
    }

    public saveSemanticIdentity(languageDocumentUri: string): void {
        const semanticModel = this.getOrLoadIdentity(languageDocumentUri).model
        this.identityStorage.saveIdentityToFile(languageDocumentUri, semanticModel)
    }

    public renameSemanticIdentity(oldLanguageUri: string, newLanguageUri: string): void {
        const identityIndex = this.indexRegistryByLanguageDocumentUri.get(oldLanguageUri)
        if (identityIndex) {
            const rootId = identityIndex.id
            this.indexRegistryByLanguageDocumentUri.delete(oldLanguageUri)
            this.indexRegistryByLanguageDocumentUri.set(newLanguageUri, identityIndex)
            this.languageDocumentUriById.set(rootId, URI.parse(newLanguageUri))
            // TODO: To optimize performance, do file rename instead of saving entirely new file
            this.identityStorage.saveIdentityToFile(newLanguageUri, identityIndex.model)
        }
    }

    public deleteSemanticIdentity(languageDocumentUri: string): void {
        const existingIdentityIndex = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (existingIdentityIndex) {
            this.indexRegistryByLanguageDocumentUri.delete(languageDocumentUri)
            this.languageDocumentUriById.delete(existingIdentityIndex.id)
        }
        this.identityStorage.deleteIdentityFile(languageDocumentUri)
    }

    protected abstract loadIdentityToIndex(languageDocumentUri: string): ModelExposedIdentityIndex<II>

    private getOrLoadIdentity(languageDocumentUri: string): ModelExposedIdentityIndex<II> {
        const loadedIdentity = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (loadedIdentity) {
            return loadedIdentity
        }
        this.loadSemanticIdentity(languageDocumentUri)
        return this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)!
    }
}
