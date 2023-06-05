import type { LangiumDocument } from 'langium'
import type { URI } from 'vscode-uri'
import type { SemanticIndex } from './semantic-types'

export interface SemanticIndexManager<SemI extends SemanticIndex> {
    getLanguageDocumentUri(id: string): URI | undefined
    getSemanticModelIndex(langiumDocument: LangiumDocument): SemI | undefined
    saveSemanticModel(languageDocumentUri: string): void
    loadSemanticModel(languageDocumentUri: string): void
    deleteSemanticModel(languageDocumentUri: string): void
}
