import type { Module } from 'langium'
import { LmsRenameProvider } from './lsp/lms-rename-provider'
import type { SemanticIdentity } from './semantic/identity'
import type { IdentityIndex } from './semantic/identity-index'
import type { LangiumModelServerDefaultServices, LangiumModelServerServices } from './services'
import { LangiumSourceModelServer } from './source/source-model-server'
import type { LmsDocument } from './workspace/documents'
import { LmsDocumentBuilder } from './workspace/lms-document-builder'

export function createLangiumModelServerDefaultModule
<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>():
Module<LangiumModelServerServices<SM, II, D>, LangiumModelServerDefaultServices<SM, II, D>> {
    return {
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
}

