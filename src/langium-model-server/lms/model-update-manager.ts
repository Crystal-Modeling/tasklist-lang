import type * as id from '../semantic/identity'
import type { LmsDocument } from '../workspace/documents'
import type { ModelUpdateCalculator } from './model-update-calculation'

// TODO: Rename it to ModelUpdateCalculators and put into model-update-calculation.ts
export interface ModelUpdateManager<SM extends id.SemanticIdentity> {
    getUpdateCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator<SM>
}

export abstract class AbstractModelUpdateManager<SM extends id.SemanticIdentity> implements ModelUpdateManager<SM> {
    protected updateCalculatorsByLangiumDocumentUri: Map<string, ModelUpdateCalculator<SM>> = new Map()

    // TODO rename to getOrCreate*
    public getUpdateCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator<SM> {
        const documentUri = lmsDocument.textDocument.uri
        const existingCalculator = this.updateCalculatorsByLangiumDocumentUri.get(documentUri)
        if (existingCalculator) {
            return existingCalculator
        }
        const newCalculator = this.createCalculator(lmsDocument)
        this.updateCalculatorsByLangiumDocumentUri.set(documentUri, newCalculator)
        return newCalculator
    }

    protected abstract createCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator<SM>
}
