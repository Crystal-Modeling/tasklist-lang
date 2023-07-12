import type { LangiumDocument} from 'langium'
import { MultiMap } from 'langium'
import { DocumentState, interruptAndCheck } from 'langium'
import type { CancellationToken } from 'vscode-languageserver'
import type * as id from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { IdentityManager } from '../semantic/identity-manager'
import type { IdentityReconciler } from '../semantic/identity-reconciler'
import type { SemanticDomainFactory } from '../semantic/semantic-domain'
import type { LangiumModelServerServices } from '../services'
import * as src from '../source/model'
import type { SourceModelSubscriptions } from '../source/source-model-subscriptions'
import type { TypeGuard } from '../utils/types'
import { LmsDocumentState, type ExtendableLangiumDocument, type LmsDocument } from './documents'
import type { SourceUpdateCombiner } from '../source/source-update-combiner'

export interface LmsDocumentBuilder {

}
export class DefaultLmsDocumentBuilder<SM extends id.SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> implements LmsDocumentBuilder {

    protected readonly createSemanticDomain: SemanticDomainFactory
    protected readonly isLmsDocument: TypeGuard<D, ExtendableLangiumDocument>
    protected readonly identityReconciler: IdentityReconciler<SM, D>
    protected readonly identityManager: IdentityManager
    protected readonly sourceModelSubscriptions: SourceModelSubscriptions
    protected readonly sourceUpdateCombiner: SourceUpdateCombiner<SM>

    protected readonly updatesForLmsDocuments: MultiMap<D, src.Update<SM>> = new MultiMap()

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.createSemanticDomain = services.semantic.SemanticDomainFactory
        this.isLmsDocument = services.workspace.LmsDocumentGuard
        this.identityReconciler = services.semantic.IdentityReconciler
        this.identityManager = services.semantic.IdentityManager
        this.sourceModelSubscriptions = services.source.SourceModelSubscriptions
        this.sourceUpdateCombiner = services.source.SourceUpdateCombiner

        const documentBuilder = services.shared.workspace.DocumentBuilder
        documentBuilder.onBuildPhase(DocumentState.IndexedReferences, this.initializeSemanticDomain.bind(this))

        documentBuilder.onBuildPhase(DocumentState.Validated, this.reconcileIdentity.bind(this))
    }

    protected async initializeSemanticDomain(documents: LangiumDocument[], cancelToken: CancellationToken) {
        for (const document of documents) {
            const lmsDocument: ExtendableLangiumDocument = document
            if (this.isLmsDocument(lmsDocument)) {
                await interruptAndCheck(cancelToken)
                if (!lmsDocument.semanticDomain) {
                    console.log(`Initializing semantic domain for ${document.uri.toString()}`)
                    lmsDocument.semanticDomain = this.createSemanticDomain()
                } else {
                    lmsDocument.semanticDomain.clear()
                }
            }
        }
    }

    protected async reconcileIdentity(documents: LangiumDocument[], cancelToken: CancellationToken) {
        console.debug('====== IDENTITY RECONCILIATION PHASE ======')
        const newUpdatesForLmsDocuments: Map<D, src.Update<SM>> = new Map()
        for (const document of documents) {
            const semanticId = this.identityManager.getIdentityIndex(document)?.id
            const lmsDocument: ExtendableLangiumDocument = document
            if (this.isLmsDocument(lmsDocument) && semanticId) {
                newUpdatesForLmsDocuments.set(lmsDocument, src.Update.createEmpty<SM>(semanticId))
            }
        }
        await interruptAndCheck(cancelToken)
        for (const iteration of this.identityReconciler.identityReconciliationIterations) {
            newUpdatesForLmsDocuments.forEach((update, lmsDocument) => iteration(lmsDocument, update))
        }
        newUpdatesForLmsDocuments.forEach((update, lmsDocument) => {
            lmsDocument.state = LmsDocumentState.Identified
            this.updatesForLmsDocuments.add(lmsDocument, update)
            console.debug('=====> For document ', lmsDocument.textDocument.uri)
            console.debug(`Calculated update (${update.id}) is`,
                (src.Update.isEmpty(update) ? 'EMPTY' : JSON.stringify(update, undefined, 2)))
        })
        await interruptAndCheck(cancelToken)

        for (const [lmsDocument, updates] of this.updatesForLmsDocuments.entriesGroupedByKey()) {
            const update = this.sourceUpdateCombiner.combineUpdates(updates)
            if (!update || src.Update.isEmpty(update)) {
                this.updatesForLmsDocuments.delete(lmsDocument)
            } else {
                this.pushUpdateToSubscriptions(update)
                this.updatesForLmsDocuments.delete(lmsDocument)
                await interruptAndCheck(cancelToken)
            }
        }
    }

    private pushUpdateToSubscriptions(update: src.Update<SM>): void {
        for (const subscription of this.sourceModelSubscriptions.getSubscriptions(update.id)) {
            subscription.pushUpdate(update)
        }
    }

}

