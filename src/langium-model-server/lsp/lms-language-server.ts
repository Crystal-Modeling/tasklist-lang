import type { LangiumSharedServices } from 'langium'
import { DefaultLanguageServer, startLanguageServer } from 'langium'
import type { Connection, InitializeParams, InitializeResult } from 'vscode-languageserver'
import { FileChangeType } from 'vscode-languageserver'
import type { SemanticIdentity } from '../identity/model'
import type { IdentityIndex } from '../identity'
import type { LangiumModelServerAddedServices } from '../services'
import type { LmsDocument } from '../workspace/documents'
import { Save } from '../lms/model'

export class LmsLanguageServer extends DefaultLanguageServer {

    protected override buildInitializeResult(_params: InitializeParams): InitializeResult {
        const initializeResult = super.buildInitializeResult(_params)

        initializeResult.capabilities.workspace = {
            ...initializeResult.capabilities.workspace,
            fileOperations: {
                didRename: { filters: [{ pattern: { glob: '**' } }] }
            }
        }

        return initializeResult
    }
}

/**
 * Entry point function to launch LMS language server.
 * Overrides the default {@link startLanguageServer} adding LS handlers for semantic model
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param lmsServices Additional {@link LangiumModelServerAddedServices} introduced by langium-model-server module
 */
//TODO: When elaborating into a library, make sure LMS is compatible with multiple Langium languages in one server
export function startLMSLanguageServer<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>(
    services: LangiumSharedServices,
    lmsServices: LangiumModelServerAddedServices<SM, II, D>
): void {
    startLanguageServer(services)
    addIdentityProcessingHandlers(services.lsp.Connection!, lmsServices)
}

function addIdentityProcessingHandlers<SM extends SemanticIdentity, II extends IdentityIndex, D extends LmsDocument>(
    connection: Connection,
    lmsServices: LangiumModelServerAddedServices<SM, II, D>
) {

    const identityManager = lmsServices.identity.IdentityManager
    const lmsSubscriptions = lmsServices.lms.LmsSubscriptions

    connection.onDidSaveTextDocument(params => {
        const rootId = identityManager.saveIdentity(params.textDocument.uri)
        lmsSubscriptions.getSubscription(rootId)?.pushAction(Save.create(rootId))
    })

    connection.onDidChangeWatchedFiles(params => {
        for (const event of params.changes) {
            switch (event.type) {
                case FileChangeType.Deleted:
                    identityManager.deleteIdentity(event.uri)
                    break
                default:
                    break
            }
        }
    })

    connection.workspace.onDidRenameFiles(params => {
        console.debug('============= > RENAMED FILES!!!', params.files)
        params.files.forEach(fileRename => {
            identityManager.renameIdentity(fileRename.oldUri, fileRename.newUri)
        })
    })
}
