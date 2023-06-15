import type { LangiumDocument } from 'langium'
import type * as id from '../semantic/identity'
import type { SourceUpdateCalculator } from './source-update-calculation'

export interface SourceUpdateManager<SM extends id.SemanticIdentity> {
    getUpdateCalculator(langiumDocument: LangiumDocument): SourceUpdateCalculator<SM>
}

export abstract class AbstractSourceUpdateManager<SM extends id.SemanticIdentity> implements SourceUpdateManager<SM> {
    protected updateCalculatorsByLangiumDocumentUri: Map<string, SourceUpdateCalculator<SM>> = new Map()

    public getUpdateCalculator(langiumDocument: LangiumDocument): SourceUpdateCalculator<SM> {
        const documentUri = langiumDocument.textDocument.uri
        const existingCalculator = this.updateCalculatorsByLangiumDocumentUri.get(documentUri)
        if (existingCalculator) {
            return existingCalculator
        }
        const newCalculator = this.createCalculator(langiumDocument)
        this.updateCalculatorsByLangiumDocumentUri.set(documentUri, newCalculator)
        return newCalculator
    }

    protected abstract createCalculator(langiumDocument: LangiumDocument): SourceUpdateCalculator<SM>
}
