import type { Module } from 'langium'
import { LmsRenameProvider } from './lsp/lms-rename-provider'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { LangiumModelServerDefaultServices, LangiumModelServerServices } from './services'
import { DefaultLangiumSourceModelServer } from './source/source-model-server'
import type { LmsDocument } from './workspace/documents'
import { DefaultLmsDocumentBuilder } from './workspace/lms-document-builder'
import { LmsSourceModelSubscriptions } from './source/source-model-subscriptions'

export function createLangiumModelServerDefaultModule
<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>():
Module<LangiumModelServerServices<SM, II, D>, LangiumModelServerDefaultServices> {
    return {
        lsp: {
            RenameProvider: (services) => new LmsRenameProvider(services)
        },
        workspace: {
            LmsDocumentBuilder: (services) => new DefaultLmsDocumentBuilder(services),
        },
        source: {
            LangiumSourceModelServer: (services) => new DefaultLangiumSourceModelServer(services),
            SourceModelSubscriptions: () => new LmsSourceModelSubscriptions()
        }
    }
}

