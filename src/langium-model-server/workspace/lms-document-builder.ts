import type { LangiumDocument } from 'langium'
import { DocumentState, interruptAndCheck } from 'langium'
import type { CancellationToken } from 'vscode-languageserver'
import type { IdentityIndex } from '../identity/identity-index'
import type { IdentityManager } from '../identity/manager'
import type * as id from '../identity/model'
import type { ModelUpdateCalculators } from '../lms/model-update-calculation'
import type { LmsSubscriptions } from '../lms/subscriptions'
import type { Identifier } from '../semantic/identifier'
import * as sem from '../semantic/model'
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
    protected readonly identifier: Identifier<SM, D>
    protected readonly identityManager: IdentityManager
    protected readonly modelUpdateCalculators: ModelUpdateCalculators<SM>
    protected readonly lmsSubscriptions: LmsSubscriptions<SM>

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.createSemanticDomain = services.semantic.SemanticDomainFactory
        this.isLmsDocument = services.workspace.LmsDocumentGuard
        this.identifier = services.semantic.Identifier
        this.identityManager = services.identity.IdentityManager
        this.modelUpdateCalculators = services.lms.ModelUpdateCalculators
        this.lmsSubscriptions = services.lms.LmsSubscriptions

        const documentBuilder = services.shared.workspace.DocumentBuilder
        documentBuilder.onBuildPhase(DocumentState.IndexedReferences, this.initializeSemanticDomain.bind(this))

        documentBuilder.onBuildPhase(DocumentState.Validated, this.identifyValidatedAst.bind(this))
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

    protected async identifyValidatedAst(documents: LangiumDocument[], cancelToken: CancellationToken) {
        console.debug('====== AST IDENTIFICATION PHASE ======')
        const unmappedIdentitiesForLmsDocuments: Map<Initialized<D>, sem.UnmappedIdentities<SM>> = new Map()
        for (const document of documents) {
            const lmsDocument: ExtendableLangiumDocument = document
            // NOTE: Actually, all LMS Documents are initialized during `initializeSemanticDomain` phase
            console.debug('Trying to identify valid AST', lmsDocument.uri.toString(), 'isLMS?', this.isLmsDocument(lmsDocument), 'isInitialized?', !!(lmsDocument as SemanticAwareDocument).semanticDomain)
            if (this.isLmsDocument(lmsDocument) && LmsDocument.isInitialized(lmsDocument)) {
                console.debug('  => For document ', lmsDocument.uri.toString(), `(${lmsDocument.semanticDomain.rootId})`)
                unmappedIdentitiesForLmsDocuments.set(lmsDocument, sem.UnmappedIdentities.createEmpty<SM>())
            }
        }
        await interruptAndCheck(cancelToken)
        for (const iteration of this.identifier.astIdentificationIterations) {
            unmappedIdentitiesForLmsDocuments.forEach((unmappedIdentities, lmsDocument) => iteration(lmsDocument, unmappedIdentities))
        }
        unmappedIdentitiesForLmsDocuments.forEach((unmappedIdentities, lmsDocument) => {
            const update = this.modelUpdateCalculators.getOrCreateCalculator(lmsDocument).calculateUpdate(unmappedIdentities)
            lmsDocument.state = LmsDocumentState.Identified
            this.lmsSubscriptions.getSubscription(update.id)?.pushModelUpdate(update, !lmsDocument.hasImmediateChanges)
            delete lmsDocument.hasImmediateChanges
        })
    }
}
