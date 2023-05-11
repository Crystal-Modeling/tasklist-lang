import { LangiumSharedServices, startLanguageServer } from "langium";
import { Connection } from "vscode-languageserver";
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
    function onDidSave(uri: string): void {
        semanticModelStorage.saveSemanticModel(uri)
    }

    const documents = services.workspace.TextDocuments;
    documents.onDidSave(change => {
        console.debug("[saved by documents]:")
        onDidSave(change.document.uri)
    })
    connection.onDidSaveTextDocument(params => {
        console.debug("[saved by connection]:")
        onDidSave(params.textDocument.uri)
    })
}