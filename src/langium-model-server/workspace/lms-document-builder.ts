import type { LangiumDocument } from 'langium'
import { DocumentState, interruptAndCheck } from 'langium'
import type { CancellationToken } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity/identity-index'
import type { IdentityManager } from '../identity/manager'
import * as id from '../identity/model'
import * as src from '../lms/model'
import type { ModelUpdateCombiner } from '../lms/model-update-combiner'
import type { LmsSubscriptions } from '../lms/subscriptions'
import type { IdentityReconciler } from '../semantic/identity-reconciler'
import type { SemanticDomainFactory } from '../semantic/semantic-domain'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import type { Initialized, SemanticAwareDocument } from './documents'
import { LmsDocument, LmsDocumentState, type ExtendableLangiumDocument } from './documents'

export interface LmsDocumentBuilder {
}
export class DefaultLmsDocumentBuilder<SM extends id.WithSemanticID, II extends IdentityIndex, D extends LmsDocument> implements LmsDocumentBuilder {

    protected readonly createSemanticDomain: SemanticDomainFactory
    protected readonly isLmsDocument: TypeGuard<D, ExtendableLangiumDocument>
    protected readonly identityReconciler: IdentityReconciler<SM, D>
    protected readonly identityManager: IdentityManager
    protected readonly lmsSubscriptions: LmsSubscriptions<SM>
    protected readonly modelUpdateCombiner: ModelUpdateCombiner<SM>

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
            if (this.isLmsDocument(document)) {
                await interruptAndCheck(cancelToken)
                if (!document.semanticDomain) {
                    console.log(`Initializing semantic domain for ${document.uri.toString()}`)
                    const identityIndex = this.identityManager.getIdentityIndex(document)
                    document.semanticDomain = this.createSemanticDomain(identityIndex.id)
                } else {
                    document.semanticDomain.clear()
                }
            }
        }
    }

    protected async reconcileIdentity(documents: LangiumDocument[], cancelToken: CancellationToken) {
        console.debug('====== IDENTITY RECONCILIATION PHASE ======')
        const newUpdatesForLmsDocuments: Map<Initialized<D>, src.RootUpdate<SM>> = new Map()
        for (const document of documents) {
            const lmsDocument: ExtendableLangiumDocument = document
            // NOTE: Actually, all LMS Documents are initialized during `initializeSemanticDomain` phase
            console.debug('Trying to reconcile document', lmsDocument.uri.toString(), 'isLMS?', this.isLmsDocument(lmsDocument), 'isInitialized?', !!(lmsDocument as SemanticAwareDocument).semanticDomain)
            if (this.isLmsDocument(lmsDocument) && LmsDocument.isInitialized(lmsDocument)) {
                console.debug('  => For document ', lmsDocument.uri.toString(), `(${lmsDocument.semanticDomain.rootId})`)
                newUpdatesForLmsDocuments.set(lmsDocument,
                    src.RootUpdate.createEmpty<SM>(lmsDocument.semanticDomain.rootId, id.ModelUri.root))
            }
        }
        await interruptAndCheck(cancelToken)
        for (const iteration of this.identityReconciler.identityReconciliationIterations) {
            newUpdatesForLmsDocuments.forEach((update, lmsDocument) => iteration(lmsDocument, update))
        }
        newUpdatesForLmsDocuments.forEach((update, lmsDocument) => {
            lmsDocument.state = LmsDocumentState.Identified
            this.lmsSubscriptions.getSubscription(update.id)?.pushModelUpdate(update, !lmsDocument.hasImmediateChanges)
            delete lmsDocument.hasImmediateChanges
        })
    }
}
