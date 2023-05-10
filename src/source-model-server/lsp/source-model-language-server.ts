import { LangiumSharedServices, startLanguageServer } from "langium";
import { Connection } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { SourceModelServices } from "../source-model-server-module";


/**
 * Entry point function to launch SourceModel language server.
 * Overrides the default {@link startLanguageServer} adding SourceModel specific LS handlers
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param sourceModelServices Additional {@link SourceModelServices} introduced by source-model-server module
 */
export function startSourceModelLanguageServer(services: LangiumSharedServices, sourceModelServices: SourceModelServices): void {
    startLanguageServer(services)
    addDocumentClosedHandler(services.lsp.Connection!, services, sourceModelServices)
}

function addDocumentClosedHandler(connection: Connection, services: LangiumSharedServices, sourceModelServices: SourceModelServices) {

    const semanticModelStorage = sourceModelServices.SemanticModelStorage;
    function onDidSave(saved: URI[]): void {
        saved.forEach(uri => {
            semanticModelStorage.saveSemanticModel()
            console.debug("Document with uri ", uri, " was saved")
        })
    }

    const documents = services.workspace.TextDocuments;
    documents.onDidSave(change => {
        console.debug("[documents]:")
        onDidSave([URI.parse(change.document.uri)]);
    });
    connection.onDidSaveTextDocument(params => {
        console.debug("[connection]:")
        onDidSave([URI.parse(params.textDocument.uri)]);
    })
}