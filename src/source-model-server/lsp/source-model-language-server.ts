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

    function onDidOpen(uri: string): void {
        // semanticModelStorage.loadSemanticModel(uri)
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

    documents.onDidOpen(change => {
        console.debug("[opened by documents]:")
        onDidOpen(change.document.uri)
    })
    connection.onDidOpenTextDocument(params => {
        console.debug("[opened by connection]:")
        onDidOpen(params.textDocument.uri)
    })
}