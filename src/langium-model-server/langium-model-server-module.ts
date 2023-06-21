import type { Module } from 'langium'
import type { LangiumModelServerDefaultServices, LangiumModelServerServices } from './services'
import { LmsRenameProvider } from './lsp/lms-rename-provider'
import { LangiumSourceModelServer } from './source/source-model-server'
import { LmsDocumentBuilder } from './workspace/lms-document-builder'

export const LangiumModelServerDefaultModule: Module<LangiumModelServerServices, LangiumModelServerDefaultServices> = {
    lsp: {
        RenameProvider: (services) => new LmsRenameProvider(services)
    },
    workspace: {
        LmsDocumentBuilder: (services) => new LmsDocumentBuilder(services),
    },
    source: {
        LangiumSourceModelServer: (services) => new LangiumSourceModelServer(services)
    }
}

