import type { AstNode, LangiumDocument, NameProvider } from 'langium'
import { getDocument } from 'langium'
import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../langium-model-server-module'
import type { SemanticModelStorage } from './semantic-storage'
import type { NamedSemanticElement } from './semantic-model'
import type { ModelAwareSemanticIndex, SemanticIndex } from './semantic-model-index'

export interface SemanticIndexManager<SemI extends SemanticIndex = SemanticIndex> {
    getLanguageDocumentUri(id: string): URI | undefined
    /**
     * Searches for a Semantic element, which corresponds to specified {@link targetNode} by its name.
     * @returns a view over the semantic element, if found.
     * @param astNode An {@link AstNode}, which name is used to find a corresponding semantic element
     */
    findNamedSemanticElement(astNode: AstNode): NamedSemanticElement | undefined
    getSemanticModelIndex(langiumDocument: LangiumDocument): SemI | undefined
    saveSemanticModel(languageDocumentUri: string): void
    loadSemanticModel(languageDocumentUri: string): void
    deleteSemanticModel(languageDocumentUri: string): void
}

export abstract class AbstractSemanticIndexManager<SemI extends SemanticIndex> implements SemanticIndexManager<SemI> {

    protected semanticModelStorage: SemanticModelStorage
    protected nameProvider: NameProvider
    private indexRegistryByLanguageDocumentUri: Map<string, ModelAwareSemanticIndex<SemI>>
    private languageDocumentUriById: Map<string, URI>

    public constructor(services: LangiumModelServerServices) {
        this.semanticModelStorage = services.semantic.SemanticModelStorage
        this.nameProvider = services.references.NameProvider
        this.indexRegistryByLanguageDocumentUri = new Map()
        this.languageDocumentUriById = new Map()
    }

    public getLanguageDocumentUri(id: string): URI | undefined {
        return this.languageDocumentUriById.get(id)
    }

    public findNamedSemanticElement(astNode: AstNode): NamedSemanticElement | undefined {
        const name = this.nameProvider.getName(astNode)
        if (!name) {
            return undefined
        }
        return this.getSemanticModelIndex(getDocument(astNode)).findElementByName(name)
    }

    public getSemanticModelIndex(languageDocument: LangiumDocument): SemI {
        return this.getOrLoadSemanticModel(languageDocument.textDocument.uri)
    }

    public loadSemanticModel(languageDocumentUri: string): void {
        const semanticModelIndex = this.loadSemanticModelToIndex(languageDocumentUri)
        this.languageDocumentUriById.set(semanticModelIndex.id, URI.parse(languageDocumentUri))
        this.indexRegistryByLanguageDocumentUri.set(languageDocumentUri, semanticModelIndex)
    }

    public saveSemanticModel(languageDocumentUri: string): void {
        const semanticModel = this.getOrLoadSemanticModel(languageDocumentUri).model
        this.semanticModelStorage.saveSemanticModelToFile(languageDocumentUri, semanticModel)
    }

    public deleteSemanticModel(languageDocumentUri: string): void {
        const existingModelIndex = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (existingModelIndex) {
            this.indexRegistryByLanguageDocumentUri.delete(languageDocumentUri)
            this.languageDocumentUriById.delete(existingModelIndex.id)
        }
        this.semanticModelStorage.deleteSemanticModelFile(languageDocumentUri)
    }

    protected abstract loadSemanticModelToIndex(languageDocumentUri: string): ModelAwareSemanticIndex<SemI>

    private getOrLoadSemanticModel(languageDocumentUri: string): ModelAwareSemanticIndex<SemI> {
        const loadedSemanticModel = this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)
        if (loadedSemanticModel) {
            return loadedSemanticModel
        }
        this.loadSemanticModel(languageDocumentUri)
        return this.indexRegistryByLanguageDocumentUri.get(languageDocumentUri)!
    }
}
