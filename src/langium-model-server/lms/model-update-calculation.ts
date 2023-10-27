import type { AstNode } from 'langium'
import { stream } from 'langium'
import type * as id from '../identity/model'
import type { WithSemanticID } from '../identity/semantic-id'
import type * as sem from '../semantic/model'
import type { Initialized, LmsDocument } from '../workspace/documents'
import type { ReadonlyArrayUpdate, RootUpdate } from './model'
import { ArrayUpdateCommand, ElementUpdate } from './model'

export interface ModelUpdateCalculators<SM extends WithSemanticID> {
    getOrCreateCalculator(lmsDocument: Initialized<LmsDocument>): ModelUpdateCalculator<SM>
}

export abstract class AbstractModelUpdateCalculators<SM extends WithSemanticID> implements ModelUpdateCalculators<SM> {
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

export interface ModelUpdateCalculator<SM extends WithSemanticID> {
    calculateUpdate(deletion: sem.UnmappedIdentities<SM>): RootUpdate<SM>
    clearSoftDeletedIdentities(): RootUpdate<SM>
}

// TODO: Either delete this pseudo-generic interface, or make it work! DoD: no "redefining the type" of ModelUpdateCalculators in task-list-module
// type DeletionsCalculation<T> = {
//     [P in KeysOfType<T, id.SemanticIdentity[]> as `calculate${Capitalize<string & P>}Update`]: T[P] extends id.SemanticIdentity[] ? (identitiesToDelete: Iterable<T[P][0]>) => ReadonlyArrayUpdate<T[P][0]> : never
// }

export function compareModelWithExistingBefore<T extends AstNode, NAME extends id.IdentityName, SRC extends WithSemanticID>(
    previous: sem.Identified<T, NAME> | undefined,
    current: sem.Identified<T, NAME>,
    sourceModelFactory: (semanticModel: sem.Identified<T, NAME>) => SRC,
    applyModelChanges: (update: ElementUpdate<SRC>, previous: sem.Identified<T, NAME> | id.Identity<T, NAME>, current: sem.Identified<T, NAME>) => void
): ReadonlyArrayUpdate<SRC> {
    const semanticId = current.$identity.id
    if (!previous) {
        if (!current.$identity.isSoftDeleted) {
            return ArrayUpdateCommand.addition(sourceModelFactory(current))
        }
        // Existed in AST long before, was marked for deletion, now reappearing
        const reappearance = ElementUpdate.createStateUpdate<SRC>(semanticId, 'REAPPEARED')
        applyModelChanges(reappearance, current.$identity.deletedSemanticModel ?? current.$identity, current)
        current.$identity.restore()
        return ArrayUpdateCommand.modification(reappearance)
    } // Existed in AST before
    const update = ElementUpdate.createEmpty<SRC>(semanticId)
    applyModelChanges(update, previous, current)
    if (current.$identity.isSoftDeleted) {// Why it was soft-deleted if it existed in the AST before?
        current.$identity.restore()
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
export function deleteModels<T extends AstNode, NAME extends id.IdentityName, SRC extends WithSemanticID>(
    getSoftDeleted: () => Iterable<id.Identity<T, NAME>>,
    getPreviousSemanticModel: (id: string) => sem.Identified<T, NAME> | undefined,
    identitiesToDelete: Iterable<id.Identity>
): ReadonlyArrayUpdate<SRC> {
    const deletedIds = stream(identitiesToDelete)
        .filter(identity => identity.delete(getPreviousSemanticModel(identity.id)))
        .map(identity => identity.id)
        .toArray()
    const softDeletetionUpdates = Array.from(getSoftDeleted(), ({ id }) => ElementUpdate.createStateUpdate<SRC>(id, 'DISAPPEARED'))
    const deletion = ArrayUpdateCommand.deletion<SRC>(deletedIds)
    const dissappearances = ArrayUpdateCommand.modification(softDeletetionUpdates)
    return ArrayUpdateCommand.all(deletion, dissappearances)
}
