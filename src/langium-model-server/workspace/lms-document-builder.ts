import type { LangiumDocument } from 'langium'
import { DocumentState, interruptAndCheck } from 'langium'
import type { SemanticDomainFactory } from '../semantic/semantic-domain'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import { LmsDocumentState, type ExtendableLangiumDocument, type LmsDocument } from './documents'
import type { CancellationToken } from 'vscode-languageserver'
import type { IdentityReconciler } from '../semantic/identity-reconciler'

export class LmsDocumentBuilder {

    protected createSemanticDomain: SemanticDomainFactory
    protected isLmsDocument: TypeGuard<LmsDocument, ExtendableLangiumDocument>
    protected identityReconciler: IdentityReconciler

    constructor(services: LangiumModelServerServices) {
        this.createSemanticDomain = services.semantic.SemanticDomainFactory
        this.isLmsDocument = services.workspace.LmsDocumentGuard
        this.identityReconciler = services.semantic.IdentityReconciler

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
        for (const document of documents) {
            const lmsDocument: ExtendableLangiumDocument = document
            if (this.isLmsDocument(lmsDocument)) {
                console.debug('       For document ', document.textDocument.uri)
                await interruptAndCheck(cancelToken)
                this.identityReconciler.reconcileIdentityWithLanguageModel(document)
                lmsDocument.state = LmsDocumentState.Identified
            }

        }
    }

}
