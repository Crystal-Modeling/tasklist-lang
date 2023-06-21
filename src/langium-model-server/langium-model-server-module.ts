import type { Module } from 'langium'
import type { LangiumModelServerDefaultServices, LangiumModelServerServices } from './services'
import { LmsRenameProvider } from './lsp/lms-rename-provider'

export const LangiumModelServerDefaultModule: Module<LangiumModelServerServices, LangiumModelServerDefaultServices> = {
    lsp: {
        RenameProvider: (services) => new LmsRenameProvider(services)
    }
}

