import { stream } from 'langium'
import type * as id from '../identity/model'
import type { LmsDocument } from '../workspace/documents'
import { ArrayUpdateCommand, ElementUpdate, type ReadonlyArrayUpdate } from './model'

export interface ModelUpdateCalculators {
    getOrCreateCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator
}

export abstract class AbstractModelUpdateCalculators implements ModelUpdateCalculators {
    protected updateCalculatorsByLangiumDocumentUri: Map<string, ModelUpdateCalculator> = new Map()

    public getOrCreateCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator {
        const documentUri = lmsDocument.textDocument.uri
        const existingCalculator = this.updateCalculatorsByLangiumDocumentUri.get(documentUri)
        if (existingCalculator) {
            return existingCalculator
        }
        const newCalculator = this.createCalculator(lmsDocument)
        this.updateCalculatorsByLangiumDocumentUri.set(documentUri, newCalculator)
        return newCalculator
    }

    protected abstract createCalculator(lmsDocument: LmsDocument): ModelUpdateCalculator
}

export interface ModelUpdateCalculator {
    // resetModelsMarkedForDeletion(): Iterable<id.IndexedIdentity>
}

// TODO: Either delete this pseudo-generic interface, or make it work! DoD: no "redefining the type" of ModelUpdateCalculators in task-list-module
// type DeletionsCalculation<T> = {
//     [P in KeysOfType<T, id.SemanticIdentity[]> as `calculate${Capitalize<string & P>}Update`]: T[P] extends id.SemanticIdentity[] ? (identitiesToDelete: Iterable<T[P][0]>) => ReadonlyArrayUpdate<T[P][0]> : never
// }

/**
 * Computes {@link ReadonlyArrayUpdate} for {@link identitiesToDelete} by comparing them with {@link modelsMarkedForDeletion}.
 *
 * ❗This function should be invoked only after all other updates are prepared, so that **reappeared nodes are unmarked for deletion**
 * @param modelsMarkedForDeletion Current registry of Semantic Models (or Semantic Identity in rare cases
 * when semantic models are unavailable), that were deleted from the AST, but not yet deleted from Semantic Identity model.
 * @param identitiesToDelete Semantic Identities to be deleted (or soft deleted); they are absent already in AST
 * (and thus in current Semantic Model), but are expected to be present in previous Semantic Model
 * fetched by {@link getPreviousSemanticModel}.
 * @param getPreviousSemanticModel Fetches corresponding previous Semantic Model from SemanticDomain
 * @returns Semantic Model Update for this deletion request
 */
export function deleteModels<ID extends id.SemanticIdentity, SEM extends id.SemanticIdentity, SRC extends id.SemanticIdentity>(
    modelsMarkedForDeletion: Map<string, ID | SEM>,
    identitiesToDelete: Iterable<ID>,
    getPreviousSemanticModel: (id: string) => SEM | undefined
): ReadonlyArrayUpdate<SRC> {
    let deletion: ReadonlyArrayUpdate<SRC> | undefined = undefined
    let identitiesToBeMarkedForDeletion = stream(identitiesToDelete)
    if (modelsMarkedForDeletion.size !== 0) {
        deletion = ArrayUpdateCommand.deletion<SRC>(modelsMarkedForDeletion.values())
        const deletedModelIds = new Set(modelsMarkedForDeletion.keys())
        modelsMarkedForDeletion.clear()
        identitiesToBeMarkedForDeletion = identitiesToBeMarkedForDeletion.filter(({ id }) => !deletedModelIds.has(id))
    }
    identitiesToBeMarkedForDeletion.forEach(identity => {
        // When we receive Semantic Identity of the model to be deleted, we first try to use
        // _Semantic Model_ with such semantic ID (which could exist in _previous_ AST state),
        // since Semantic Model stores all attributes and we will be able to do more precise comparison
        // if it reappears later
        modelsMarkedForDeletion.set(identity.id, getPreviousSemanticModel(identity.id) ?? identity)
    })
    const dissappearances = ArrayUpdateCommand.modification(
        Array.from(modelsMarkedForDeletion.keys(), id => ElementUpdate.createStateUpdate<SRC>(id, 'DISAPPEARED')))
    return deletion ? ArrayUpdateCommand.all(deletion, dissappearances) : dissappearances
}
