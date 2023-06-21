import type { Module } from 'langium'
import type { LangiumModelServerDefaultServices, LangiumModelServerServices } from './services'
import { LmsRenameProvider } from './lsp/lms-rename-provider'
import { LangiumSourceModelServer } from './source/source-model-server'

export const LangiumModelServerDefaultModule: Module<LangiumModelServerServices, LangiumModelServerDefaultServices> = {
    lsp: {
        RenameProvider: (services) => new LmsRenameProvider(services)
    },
    source: {
        LangiumSourceModelServer: (services) => new LangiumSourceModelServer(services)
    }
}

