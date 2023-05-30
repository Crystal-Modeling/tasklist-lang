import type { LangiumSharedServices} from 'langium'
import { startLanguageServer } from 'langium'
import type { Connection} from 'vscode-languageserver'
import { FileChangeType } from 'vscode-languageserver'
import type { LangiumModelServerServices } from '../langium-model-server-module'

/**
 * Entry point function to launch LMS language server.
 * Overrides the default {@link startLanguageServer} adding LS handlers for semantic model
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param lmsServices Additional {@link LangiumModelServerServices} introduced by langium-model-server module
 */
export function startLMSLanguageServer(services: LangiumSharedServices, lmsServices: LangiumModelServerServices): void {
    startLanguageServer(services)
    addSemanticModelProcessingHandlers(services.lsp.Connection!, lmsServices)
}

//TODO: When elaborating into a library, make sure LMS is compatible with multiple Langium languages in one server
function addSemanticModelProcessingHandlers(connection: Connection, lmsServices: LangiumModelServerServices) {

    const semanticIndexManager = lmsServices.semantic.SemanticIndexManager

    connection.onDidSaveTextDocument(params => {
        semanticIndexManager.saveSemanticModel(params.textDocument.uri)
    })

    connection.onDidChangeWatchedFiles(params => {
        for (const event of params.changes) {
            switch (event.type) {
                case FileChangeType.Deleted:
                    semanticIndexManager.deleteSemanticModel(event.uri)
                    break
                default:
                    break
            }
        }
    })
}
