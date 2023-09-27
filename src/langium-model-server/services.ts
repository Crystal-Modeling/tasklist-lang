import type { DeepPartial, DocumentHighlightProvider, LangiumServices, LanguageServer, PartialLangiumServices, RenameProvider } from 'langium'
import type { IdentityIndex } from './identity'
import type { IdentityManager } from './identity/manager'
import type { SemanticIdentity } from './identity/model'
import type { IdentityStorage } from './identity/storage'
import type { LangiumModelServerFacade } from './lms/facade'
import type { LangiumModelServer } from './lms/langium-model-server'
import type { ModelUpdateCalculators } from './lms/model-update-calculation'
import type { ModelUpdateCombiner } from './lms/model-update-combiner'
import type { LmsSubscriptions } from './lms/subscriptions'
import type { TextEditService } from './lms/text-edit-service'
import type { IdentityReconciler } from './semantic/identity-reconciler'
import type { SemanticDomainFactory } from './semantic/semantic-domain'
import type { TypeGuard } from './utils/types'
import type { ExtendableLangiumDocument, LmsDocument } from './workspace/documents'
import type { LmsDocumentBuilder } from './workspace/lms-document-builder'

/**
 * LMS services with default implementation available, not required to be overriden
 */
export type LangiumModelServerDefaultServices<SM extends SemanticIdentity> = {
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
        LmsSubscriptions: LmsSubscriptions<SM>,
        TextEditService: TextEditService,
    }
}

export type LangiumModelServerDefaultSharedServices = {
    lsp: {
        LanguageServer: LanguageServer
    }
}

export type LangiumModelServerAbstractServices<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument> = {
    workspace: {
        LmsDocumentGuard: TypeGuard<D, ExtendableLangiumDocument>
    },
    identity: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<SM, II>,
    }
    semantic: {
        IdentityReconciler: IdentityReconciler<SM, D>,
        SemanticDomainFactory: SemanticDomainFactory,
    },
    lms: {
        LangiumModelServerFacade: LangiumModelServerFacade<SM>,
        ModelUpdateCalculators: ModelUpdateCalculators<SM>,
        ModelUpdateCombiner: ModelUpdateCombiner<SM>
    }
}

export type LmsServices<SM extends SemanticIdentity>
    = Pick<LangiumModelServerAddedServices<SM, IdentityIndex<SM>, LmsDocument>, 'lms'>['lms']

export type LangiumModelServerAddedServices<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument>
    = LangiumModelServerDefaultServices<SM> & LangiumModelServerAbstractServices<SM, II, D>

export type LangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument>
    = LangiumServices & LangiumModelServerAddedServices<SM, II, D>

export type PartialLangiumModelServerServices<SM extends SemanticIdentity, II extends IdentityIndex<SM>, D extends LmsDocument>
    = LangiumModelServerAbstractServices<SM, II, D> & PartialLangiumServices & DeepPartial<LangiumModelServerDefaultServices<SM>>
