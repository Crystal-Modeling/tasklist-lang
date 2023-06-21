import type { DeepPartial, LangiumServices, PartialLangiumServices, RenameProvider } from 'langium'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityStorage } from './semantic/identity-storage'
import type { SourceModelService } from './source/source-model-service'
import type { SourceUpdateManager } from './source/source-update-manager'

/**
 * LMS services with default implementation available, not required to be overriden
 */
export type LangiumModelServerDefaultServices = {
    lsp: {
        RenameProvider: RenameProvider,
    }
}

export type LangiumModelServerAddedServices<SM extends SemanticIdentity = SemanticIdentity, II extends IdentityIndex = IdentityIndex> = {
    semantic: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<II>,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
        SourceUpdateManager: SourceUpdateManager<SM>
    }
}

export type LangiumModelServerServices<SM extends SemanticIdentity = SemanticIdentity, II extends IdentityIndex = IdentityIndex>
    = LangiumServices & LangiumModelServerDefaultServices & LangiumModelServerAddedServices<SM, II>

export type PartialLangiumModelServerServices<SM extends SemanticIdentity = SemanticIdentity, II extends IdentityIndex = IdentityIndex>
    = LangiumModelServerAddedServices<SM, II> & PartialLangiumServices & DeepPartial<LangiumModelServerDefaultServices>
