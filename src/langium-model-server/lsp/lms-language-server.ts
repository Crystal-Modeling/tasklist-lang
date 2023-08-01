import type { LangiumSharedServices } from 'langium'
import { DefaultLanguageServer, startLanguageServer } from 'langium'
import type { Connection, InitializeParams, InitializeResult } from 'vscode-languageserver'
import { FileChangeType } from 'vscode-languageserver'
import type { SemanticIdentity } from '../semantic/identity'
import type { IdentityIndex } from '../semantic/identity-index'
import type { LangiumModelServerAddedServices } from '../services'
import type { LmsDocument } from '../workspace/documents'

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

    const semanticIndexManager = lmsServices.semantic.IdentityManager

    connection.onDidSaveTextDocument(params => {
        semanticIndexManager.saveIdentity(params.textDocument.uri)
    })

    connection.onDidChangeWatchedFiles(params => {
        for (const event of params.changes) {
            switch (event.type) {
                case FileChangeType.Deleted:
                    semanticIndexManager.deleteIdentity(event.uri)
                    break
                default:
                    break
            }
        }
    })

    connection.workspace.onDidRenameFiles(params => {
        console.debug('============= > RENAMED FILES!!!', params.files)
        params.files.forEach(fileRename => {
            semanticIndexManager.renameIdentity(fileRename.oldUri, fileRename.newUri)
        })
    })
}
