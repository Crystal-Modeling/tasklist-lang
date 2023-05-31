import type { LangiumDocument, LangiumDocuments } from 'langium'
import type { LangiumModelServerServices } from '../langium-model-server-module'
import type { SemanticIndexManager } from '../semantic/semantic-manager'

export interface SourceModelService<SM> {
    getById(id: string): SM | undefined
}

export abstract class DefaultSourceModelService<SM, SemI> implements SourceModelService<SM> {

    protected semanticIndexManager: SemanticIndexManager<SemI>
    protected langiumDocuments: LangiumDocuments

    constructor(services: LangiumModelServerServices<SM, SemI>) {
        this.semanticIndexManager = services.semantic.SemanticIndexManager
        this.langiumDocuments = services.shared.workspace.LangiumDocuments
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
        const semanticModelIndex = this.semanticIndexManager.getSemanticModelIndex(langiumDocument)
        if (!semanticModelIndex) {
            return undefined
        }
        return this.combineSemanticModelWithAst(semanticModelIndex, langiumDocument)
    }

    protected abstract combineSemanticModelWithAst(semanticModelIndex: SemI, langiumDocument: LangiumDocument): SM
}
