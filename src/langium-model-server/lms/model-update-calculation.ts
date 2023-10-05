import { stream } from 'langium'
import type * as id from '../identity/model'
import type { Initialized } from '../workspace/documents'
import type { LmsDocument } from '../workspace/documents'
import type { ReadonlyArrayUpdate, RootUpdate } from './model'
import { ArrayUpdateCommand, ElementUpdate } from './model'

export interface ModelUpdateCalculators<SM extends id.SemanticIdentity> {
    getOrCreateCalculator(lmsDocument: Initialized<LmsDocument>): ModelUpdateCalculator<SM>
}

export abstract class AbstractModelUpdateCalculators<SM extends id.SemanticIdentity> implements ModelUpdateCalculators<SM> {
    protected updateCalculatorsByLangiumDocumentUri: Map<string, ModelUpdateCalculator<SM>> = new Map()

    public getOrCreateCalculator(lmsDocument: Initialized<LmsDocument>): ModelUpdateCalculator<SM> {
        const documentUri = lmsDocument.textDocument.uri
        const existingCalculator = this.updateCalculatorsByLangiumDocumentUri.get(documentUri)
        if (existingCalculator) {
            return existingCalculator
        }
        const newCalculator = this.createCalculator(lmsDocument)
        this.updateCalculatorsByLangiumDocumentUri.set(documentUri, newCalculator)
        return newCalculator
    }

    protected abstract createCalculator(lmsDocument: Initialized<LmsDocument>): ModelUpdateCalculator<SM>
}

export interface ModelUpdateCalculator<SM extends id.SemanticIdentity> {
    clearModelsMarkedForDeletion(): RootUpdate<SM>
}

// TODO: Either delete this pseudo-generic interface, or make it work! DoD: no "redefining the type" of ModelUpdateCalculators in task-list-module
// type DeletionsCalculation<T> = {
//     [P in KeysOfType<T, id.SemanticIdentity[]> as `calculate${Capitalize<string & P>}Update`]: T[P] extends id.SemanticIdentity[] ? (identitiesToDelete: Iterable<T[P][0]>) => ReadonlyArrayUpdate<T[P][0]> : never
// }

export function compareModelWithExistingBefore<ID extends id.SemanticIdentity, SEM extends id.SemanticIdentity, SRC extends id.SemanticIdentity>(
    modelsMarkedForDeletion: Map<string, ID | SEM>,
    previous: SEM | undefined,
    current: SEM,
    sourceModelFactory: (semanticModel: SEM) => SRC,
    applyModelChanges: (update: ElementUpdate<SRC>, previous: SEM | ID, current: SEM) => void
): ReadonlyArrayUpdate<SRC> {
    const semanticId = current.id
    const previousMarkedForDeletion = modelsMarkedForDeletion.get(semanticId)
    modelsMarkedForDeletion.delete(semanticId)
    if (!previous) {
        if (!previousMarkedForDeletion) {
            return ArrayUpdateCommand.addition(sourceModelFactory(current))
        }
        // Existed in AST long before, was marked for deletion, now reappearing
        const reappearance = ElementUpdate.createStateUpdate<SRC>(semanticId, 'REAPPEARED')
        applyModelChanges(reappearance, previousMarkedForDeletion, current)
        return ArrayUpdateCommand.modification(reappearance)
    } // Existed in AST before
    const update = ElementUpdate.createEmpty<SRC>(semanticId)
    applyModelChanges(update, previous, current)
    if (previousMarkedForDeletion) {// Why it was marked for deletion if it existed in the AST before?
        console.warn(`Model '${semanticId}' existed in previous AST, but was marked for deletion.`)
        update.__state = 'REAPPEARED'
    }
    return ArrayUpdateCommand.modification(update)
}

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
    getPreviousSemanticModel: (id: string) => SEM | undefined,
    identitiesToDelete: Iterable<ID>
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
        const previousSemanticModel = getPreviousSemanticModel(identity.id)
        if (!previousSemanticModel) {
            /* NOTE: A VERY edge case: There is no previous Semantic Model for currently missing in AST element (though identity is present).
                It is only possible, if identity model went out of sync with source language file, i.e.,
                some identities were retained in JSON file, but corresponding source models had been deleted from the language file
            */
            console.warn(`Model '${identity.id}' is to be marked for deletion, but it doesn't have a corresponding previous semantic model`)
        }
        modelsMarkedForDeletion.set(identity.id, previousSemanticModel ?? identity)
    })
    const dissappearances = ArrayUpdateCommand.modification(
        Array.from(modelsMarkedForDeletion.keys(), id => ElementUpdate.createStateUpdate<SRC>(id, 'DISAPPEARED')))
    return deletion ? ArrayUpdateCommand.all(deletion, dissappearances) : dissappearances
}
