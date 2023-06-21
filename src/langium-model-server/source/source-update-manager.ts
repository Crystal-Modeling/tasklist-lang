import type * as id from '../semantic/identity'
import type { LmsDocument } from '../workspace/documents'
import type { SourceUpdateCalculator } from './source-update-calculation'

export interface SourceUpdateManager<SM extends id.SemanticIdentity> {
    getUpdateCalculator(lmsDocument: LmsDocument): SourceUpdateCalculator<SM>
}

export abstract class AbstractSourceUpdateManager<SM extends id.SemanticIdentity> implements SourceUpdateManager<SM> {
    protected updateCalculatorsByLangiumDocumentUri: Map<string, SourceUpdateCalculator<SM>> = new Map()

    public getUpdateCalculator(lmsDocument: LmsDocument): SourceUpdateCalculator<SM> {
        const documentUri = lmsDocument.textDocument.uri
        const existingCalculator = this.updateCalculatorsByLangiumDocumentUri.get(documentUri)
        if (existingCalculator) {
            return existingCalculator
        }
        const newCalculator = this.createCalculator(lmsDocument)
        this.updateCalculatorsByLangiumDocumentUri.set(documentUri, newCalculator)
        return newCalculator
    }

    protected abstract createCalculator(lmsDocument: LmsDocument): SourceUpdateCalculator<SM>
}
