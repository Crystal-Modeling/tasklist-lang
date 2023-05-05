import { LangiumSharedServices, startLanguageServer } from "langium";
import { Connection } from "vscode-languageserver";
import { URI } from "vscode-uri";
import { SourceModelServices } from "../source-model-server-module";


export function startSourceModelLanguageServer(services: LangiumSharedServices, sourceModelServices: SourceModelServices): void {
    startLanguageServer(services)
    addDocumentClosedHandler(services.lsp.Connection!, services, sourceModelServices)
}

function addDocumentClosedHandler(connection: Connection, services: LangiumSharedServices, sourceModelServices: SourceModelServices) {

    function onDidSave(saved: URI[]): void {
        saved.forEach(uri => {
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