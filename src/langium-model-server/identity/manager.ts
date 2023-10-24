import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import type { WithSemanticID } from './model'
import type { IdentityIndex, ModelExposedIdentityIndex } from './indexed'
import type { IdentityStorage } from './storage'

export interface IdentityManager<II extends IdentityIndex = IdentityIndex, D extends LmsDocument = LmsDocument> {
    getLanguageDocumentUri(id: string): URI | undefined
    getIdentityIndex(lmsDocument: D): II
    /**
     * @param languageDocumentUri URI of the Langium TextDocument to save identity model for
     * @returns Root id of saved semantic identity
     */
    saveIdentity(languageDocumentUri: string): string
    loadIdentity(languageDocumentUri: string): void
    deleteIdentity(languageDocumentUri: string): void
    renameIdentity(oldLanguageDocumentUri: string, languageDocumentUri: string): void
}

export abstract class AbstractIdentityManager<SM extends WithSemanticID, II extends IdentityIndex, D extends LmsDocument> implements IdentityManager<II, D> {

    protected identityStorage: IdentityStorage
    private indexRegistryByLanguageDocumentUri: Map<string, ModelExposedIdentityIndex<II>>
    private languageDocumentUriById: Map<string, URI>

    public constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.identityStorage = services.identity.IdentityStorage
        this.indexRegistryByLanguageDocumentUri = new Map()
        this.languageDocumentUriById = new Map()
    }

    public getLanguageDocumentUri(id: string): URI | undefined {
        return this.languageDocumentUriById.get(id)
    }

    public getIdentityIndex(lmsDocument: LmsDocument): II {
        return this.getOrLoadIdentity(lmsDocument.textDocument.uri)
    }

    public loadIdentity(languageDocumentUri: string): void {
        const identityIndex = this.loadIdentityToIndex(languageDocumentUri)
        this.languageDocumentUriById.set(identityIndex.id, URI.parse(languageDocumentUri))
        this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, identityIndex)
    }

    public saveIdentity(languageDocumentUri: string): string {
        const rootIdentity = this.getOrLoadIdentity(languageDocumentUri)
        this.identityStorage.saveIdentityToFile(languageDocumentUri, rootIdentity.model)
        return rootIdentity.id
    }

    public renameIdentity(oldLanguageDocumentUri: string, languageDocumentUri: string): void {
        const identityIndex = this.indexRegistryByLanguageDocumentUri.get(oldLanguageDocumentUri)
        if (identityIndex) {
            const rootId = identityIndex.id
            const newLanguageDocumentUri = URI.parse(languageDocumentUri)
            this.indexRegistryByLanguageDocumentUri.delete(oldLanguageDocumentUri)
            this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, identityIndex)
            this.languageDocumentUriById.set(rootId, newLanguageDocumentUri)
            this.identityStorage.renameIdentityFile(oldLanguageDocumentUri, newLanguageDocumentUri)
        }
    }

    public deleteIdentity(languageDocumentUri: string): void {
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
        this.loadIdentity(languageDocumentUri)
        return this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)!
    }
}
