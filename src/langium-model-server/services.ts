import type { DeepPartial, DocumentHighlightProvider, LangiumServices, LanguageServer, PartialLangiumServices, RenameProvider } from 'langium'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityReconciler } from './semantic/identity-reconciler'
import type { IdentityStorage } from './semantic/identity-storage'
import type { SemanticDomainFactory } from './semantic/semantic-domain'
import type { LangiumSourceModelServer } from './lms/source-model-server'
import type { SourceModelService } from './lms/source-model-service'
import type { SourceModelSubscriptions } from './lms/source-model-subscriptions'
import type { SourceUpdateCombiner } from './lms/source-update-combiner'
import type { SourceUpdateManager } from './lms/source-update-manager'
import type { TypeGuard } from './utils/types'
import type { ExtendableLangiumDocument, LmsDocument } from './workspace/documents'
import type { LmsDocumentBuilder } from './workspace/lms-document-builder'

/**
 * LMS services with default implementation available, not required to be overriden
 */
export type LangiumModelServerDefaultServices = {
    lsp: {
        RenameProvider: RenameProvider,
        DocumentHighlightProvider: DocumentHighlightProvider,
    },
    workspace: {
        // NOTE: Lms prefix added here because DocumentBuilder service exists in Langium
        LmsDocumentBuilder: LmsDocumentBuilder
    },
    lms: {
        LangiumSourceModelServer: LangiumSourceModelServer,
        SourceModelSubscriptions: SourceModelSubscriptions
    }
}

export type LangiumModelServerDefaultSharedServices = {
    lsp: {
        LanguageServer: LanguageServer
    }
}

export type LangiumModelServerAbstractServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument> = {
    workspace: {
        LmsDocumentGuard: TypeGuard<D, ExtendableLangiumDocument>
    },
    semantic: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<II>,
        IdentityReconciler: IdentityReconciler<SM, D>,
        SemanticDomainFactory: SemanticDomainFactory,
    },
    lms: {
        SourceModelService: SourceModelService<SM>,
        SourceUpdateManager: SourceUpdateManager<SM>,
        SourceUpdateCombiner: SourceUpdateCombiner<SM>
    }
}

export type LmsServices<SM extends object>
    = Pick<LangiumModelServerAddedServices<SM & SemanticIdentity, IdentityIndex, LmsDocument>, 'lms'>['lms']

export type LangiumModelServerAddedServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumModelServerDefaultServices & LangiumModelServerAbstractServices<SM, II, D>

export type LangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumServices & LangiumModelServerAddedServices<SM, II, D>

export type PartialLangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>
    = LangiumModelServerAbstractServices<SM, II, D> & PartialLangiumServices & DeepPartial<LangiumModelServerDefaultServices>
