import type { LangiumSharedServices} from 'langium'
import { startLanguageServer } from 'langium'
import type { Connection} from 'vscode-languageserver'
import { FileChangeType } from 'vscode-languageserver'
import type { SourceModelServices } from '../source-model-server-module'

/**
 * Entry point function to launch SourceModel language server.
 * Overrides the default {@link startLanguageServer} adding SourceModel specific LS handlers
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param sourceModelServices Additional {@link SourceModelServices} introduced by source-model-server module
 */
export function startSourceModelLanguageServer(services: LangiumSharedServices, sourceModelServices: SourceModelServices): void {
    startLanguageServer(services)
    addSemanticModelProcessingHandlers(services.lsp.Connection!, sourceModelServices)
}

function addSemanticModelProcessingHandlers(connection: Connection, sourceModelServices: SourceModelServices) {

    const semanticIndexManager = sourceModelServices.SemanticIndexManager

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
