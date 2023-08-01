import type { DeepPartial, DocumentHighlightProvider, LangiumServices, LanguageServer, PartialLangiumServices, RenameProvider } from 'langium'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityReconciler } from './semantic/identity-reconciler'
import type { IdentityStorage } from './semantic/identity-storage'
import type { SemanticDomainFactory } from './semantic/semantic-domain'
import type { LangiumModelServer } from './lms/langium-model-server'
import type { LangiumModelServerFacade } from './lms/facade'
import type { LmsSubscriptions } from './lms/subscriptions'
import type { ModelUpdateCombiner } from './lms/model-update-combiner'
import type { ModelUpdateManager } from './lms/model-update-manager'
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
        LangiumModelServer: LangiumModelServer,
        LmsSubscriptions: LmsSubscriptions
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
        LangiumModelServerFacade: LangiumModelServerFacade<SM>,
        ModelUpdateManager: ModelUpdateManager<SM>,
        ModelUpdateCombiner: ModelUpdateCombiner<SM>
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
