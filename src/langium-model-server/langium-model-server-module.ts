import type { LangiumServices } from 'langium'
import type { IdentityManager } from './semantic/identity-manager'
import type { IdentityStorage } from './semantic/identity-storage'
import type { IdentityIndex } from './semantic/identity-index'
import type { SourceModelService } from './source/source-model-service'
import type { LmsRenameProvider } from './lsp/lms-rename-provider'

export type LangiumModelServerAddedServices<SM = object, II extends IdentityIndex = IdentityIndex> = {
    semantic: {
        IdentityStorage: IdentityStorage,
        IdentityManager: IdentityManager<II>,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
    },
    lsp: {
        RenameProvider: LmsRenameProvider,
    }
}

export type LangiumModelServerServices<SM = object, II extends IdentityIndex = IdentityIndex>
    = LangiumServices & LangiumModelServerAddedServices<SM, II>
