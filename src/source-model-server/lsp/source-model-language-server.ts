import { LangiumSharedServices, startLanguageServer } from "langium";
import { Connection, FileChangeType } from "vscode-languageserver";
import { SourceModelServices } from "../source-model-server-module";


/**
 * Entry point function to launch SourceModel language server.
 * Overrides the default {@link startLanguageServer} adding SourceModel specific LS handlers
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param sourceModelServices Additional {@link SourceModelServices} introduced by source-model-server module
 */
export function startSourceModelLanguageServer(services: LangiumSharedServices, sourceModelServices: SourceModelServices): void {
    startLanguageServer(services)
    addSemanticModelProcessingHandlers(services.lsp.Connection!, services, sourceModelServices)
}

function addSemanticModelProcessingHandlers(connection: Connection, services: LangiumSharedServices, sourceModelServices: SourceModelServices) {

    const semanticModelStorage = sourceModelServices.SemanticModelStorage;

    connection.onDidSaveTextDocument(params => {
        semanticModelStorage.saveSemanticModel(params.textDocument.uri)
    })

    connection.onDidChangeWatchedFiles(params => {
        for (const event of params.changes) {
            switch (event.type) {
                case FileChangeType.Deleted:
                    semanticModelStorage.deleteSemanticModel(event.uri)
                    break;
                default:
                    break;
            }
        }
    });
}