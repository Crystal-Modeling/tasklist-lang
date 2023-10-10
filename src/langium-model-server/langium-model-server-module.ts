import type { LangiumSharedServices, Module } from 'langium'
import { LmsDocumentHighlightProvider } from './lsp/document-highlight-provider'
import { LmsLanguageServer } from './lsp/lms-language-server'
import { LmsRenameProvider } from './lsp/rename-provider'
import type { SemanticIdentifier } from './identity/model'
import type { IdentityIndex } from './identity'
import type { LangiumModelServerDefaultServices, LangiumModelServerDefaultSharedServices, LangiumModelServerServices } from './services'
import { DefaultLangiumSourceModelServer } from './lms/langium-model-server'
import { DefaultLmsSubscriptions } from './lms/subscriptions'
import type { LmsDocument } from './workspace/documents'
import { DefaultLmsDocumentBuilder } from './workspace/lms-document-builder'
import { DefaultTextEditService } from './lms/text-edit-service'

export function createLangiumModelServerDefaultModule
<SM extends SemanticIdentifier, II extends IdentityIndex<SM>, D extends LmsDocument>():
Module<LangiumModelServerServices<SM, II, D>, LangiumModelServerDefaultServices<SM>> {
    return {
        lsp: {
            RenameProvider: (services) => new LmsRenameProvider(services),
            DocumentHighlightProvider: (services) => new LmsDocumentHighlightProvider(services),
        },
        workspace: {
            LmsDocumentBuilder: (services) => new DefaultLmsDocumentBuilder(services),
        },
        lms: {
            LangiumModelServer: (services) => new DefaultLangiumSourceModelServer(services),
            LmsSubscriptions: (services) => new DefaultLmsSubscriptions(services.lms.ModelUpdateCombiner),
            TextEditService: (services) => new DefaultTextEditService(services)
        }
    }
}

export const langiumModelServerDefaultSharedModule: Module<LangiumSharedServices, LangiumModelServerDefaultSharedServices> = {
    lsp: {
        LanguageServer: (services) => new LmsLanguageServer(services)
    },
}
