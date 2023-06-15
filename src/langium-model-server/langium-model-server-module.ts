import type { LangiumServices } from 'langium'
import type { LmsRenameProvider } from './lsp/lms-rename-provider'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityStorage } from './semantic/identity-storage'
import type { SourceModelService } from './source/source-model-service'
import type { SourceUpdateManager } from './source/source-update-manager'

export type LangiumModelServerAddedServices<SM extends SemanticIdentity = SemanticIdentity, II extends IdentityIndex = IdentityIndex> = {
    semantic: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<II>,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
        SourceUpdateManager: SourceUpdateManager<SM>
    },
    lsp: {
        RenameProvider: LmsRenameProvider,
    }
}

export type LangiumModelServerServices<SM extends SemanticIdentity = SemanticIdentity, II extends IdentityIndex = IdentityIndex>
    = LangiumServices & LangiumModelServerAddedServices<SM, II>
