import type { LangiumDocument } from 'langium'
import { DocumentState, MultiMap, interruptAndCheck } from 'langium'
import type { CancellationToken } from 'vscode-languageserver'
import * as src from '../lms/model'
import type { ModelUpdateCombiner } from '../lms/model-update-combiner'
import type { LmsSubscriptions } from '../lms/subscriptions'
import * as id from '../identity/model'
import type { IdentityIndex } from '../identity'
import type { IdentityManager } from '../identity/manager'
import type { IdentityReconciler } from '../semantic/identity-reconciler'
import type { SemanticDomainFactory } from '../semantic/semantic-domain'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import type { Initialized } from './documents'
import { LmsDocument, LmsDocumentState, type ExtendableLangiumDocument } from './documents'

export interface LmsDocumentBuilder {
    reconcileIdentity(documents: LangiumDocument[], cancelToken: CancellationToken, withTimeout: boolean): Promise<void>
}
export class DefaultLmsDocumentBuilder<SM extends id.SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> implements LmsDocumentBuilder {

    protected readonly createSemanticDomain: SemanticDomainFactory
    protected readonly isLmsDocument: TypeGuard<D, ExtendableLangiumDocument>
    protected readonly identityReconciler: IdentityReconciler<SM, D>
    protected readonly identityManager: IdentityManager
    protected readonly lmsSubscriptions: LmsSubscriptions
    protected readonly modelUpdateCombiner: ModelUpdateCombiner<SM>

    protected readonly updatesForLmsDocuments: MultiMap<D, src.RootUpdate<SM>> = new MultiMap()
    private updatePushingTimeout: NodeJS.Timeout

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.createSemanticDomain = services.semantic.SemanticDomainFactory
        this.isLmsDocument = services.workspace.LmsDocumentGuard
        this.identityReconciler = services.semantic.IdentityReconciler
        this.identityManager = services.identity.IdentityManager
        this.lmsSubscriptions = services.lms.LmsSubscriptions
        this.modelUpdateCombiner = services.lms.ModelUpdateCombiner

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

    public async reconcileIdentity(documents: LangiumDocument[], cancelToken: CancellationToken, withTimeout: boolean = true) {
        console.debug('====== IDENTITY RECONCILIATION PHASE ======')
        const newUpdatesForLmsDocuments: Map<Initialized<D>, src.RootUpdate<SM>> = new Map()
        for (const document of documents) {
            const semanticId = this.identityManager.getIdentityIndex(document).id
            const lmsDocument: ExtendableLangiumDocument = document
            // NOTE: Actually, all LMS Documents are initialized during `initializeSemanticDomain` phase
            if (this.isLmsDocument(lmsDocument) && LmsDocument.isInitialized(lmsDocument)) {
                newUpdatesForLmsDocuments.set(lmsDocument, src.RootUpdate.createEmpty<SM>(semanticId, id.ModelUri.root))
            }
        }
        await interruptAndCheck(cancelToken)
        for (const iteration of this.identityReconciler.identityReconciliationIterations) {
            newUpdatesForLmsDocuments.forEach((update, lmsDocument) => iteration(lmsDocument, update))
        }
        newUpdatesForLmsDocuments.forEach((update, lmsDocument) => {
            lmsDocument.state = LmsDocumentState.Identified
            if (!src.Update.isEmpty(update)) {
                this.updatesForLmsDocuments.add(lmsDocument, update)
            }
        })
        await interruptAndCheck(cancelToken)

        if (withTimeout) {
            if (!this.updatePushingTimeout) {
                this.updatePushingTimeout = setTimeout(this.combineAndPushUpdates.bind(this), 300)
            } else {
                this.updatePushingTimeout.refresh()
            }
        } else {
            this.combineAndPushUpdates()
        }
    }

    private combineAndPushUpdates(): void {
        for (const [lmsDocument, updates] of this.updatesForLmsDocuments.entriesGroupedByKey()) {
            const update = this.modelUpdateCombiner.combineUpdates(updates)
            if (update && !src.Update.isEmpty(update)) {
                console.debug('=====> For document ', lmsDocument.textDocument.uri)
                this.pushUpdateToSubscriptions(update)
            }
            this.updatesForLmsDocuments.delete(lmsDocument)
        }
    }

    private pushUpdateToSubscriptions(update: src.RootUpdate<SM>): void {
        this.lmsSubscriptions.getSubscription(update.id)?.pushUpdate(update)
    }

}
