import * as http2 from 'http2'
import * as path from 'path'
import { promisify } from 'util'
import * as vscode from 'vscode'
import type { LanguageClientOptions, ServerOptions } from 'vscode-languageclient/node'
import {
    LanguageClient, TransportKind
} from 'vscode-languageclient/node'

let client: LanguageClient
let modelServer: http2.Http2Server

// This function is called when the extension is activated.
export function activate(context: vscode.ExtensionContext): void {
    client = startLanguageClient(context)
    modelServer = startModelServer(context)
}

// This function is called when the extension is deactivated.
export function deactivate(): Thenable<void> | undefined {
    if (client && modelServer) {
        return client.stop().then(promisify(modelServer.close))
    }
    if (client) {
        return client.stop()
    }
    if (modelServer) {
        return promisify(modelServer.close)()
    }
    return undefined
}

function startLanguageClient(context: vscode.ExtensionContext): LanguageClient {
    const serverModule = context.asAbsolutePath(path.join('out', 'language-server', 'main'))
    // The debug options for the server
    // --inspect=6009: runs the server in Node's Inspector mode so VS Code can attach to the server for debugging.
    // By setting `process.env.DEBUG_BREAK` to a truthy value, the language server will wait until a debugger is attached.
    const debugOptions = { execArgv: ['--nolazy', `--inspect${process.env.DEBUG_BREAK ? '-brk' : ''}=${process.env.DEBUG_SOCKET || '6009'}`] }

    // If the extension is launched in debug mode then the debug server options are used
    // Otherwise the run options are used
    const serverOptions: ServerOptions = {
        run: { module: serverModule, transport: TransportKind.ipc },
        debug: { module: serverModule, transport: TransportKind.ipc, options: debugOptions }
    }

    const fileSystemWatcher = vscode.workspace.createFileSystemWatcher('**/*.tasks')
    context.subscriptions.push(fileSystemWatcher)

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
        documentSelector: [{ scheme: 'file', language: 'task-list' }],
        synchronize: {
            // Notify the server about file changes to files contained in the workspace
            fileEvents: fileSystemWatcher
        }
    }

    // Create the language client and start the client.
    const client = new LanguageClient(
        'task-list-lang',
        'Task List Language',
        serverOptions,
        clientOptions
    )

    // Start the client. This will also launch the server
    client.start()
    return client
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function startModelServer(context: vscode.ExtensionContext): http2.Http2Server {
    return http2.createServer()
        .on('sessionError', console.error)
        .on('stream', (stream,) => {
            stream.respond({ ':status': 200 })
            stream.end('Hello World!')
        })
        .listen(8080)
}
