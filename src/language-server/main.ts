import { NodeFileSystem } from 'langium/node'
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node'
import { startLMSLanguageServer } from '../langium-model-server/lsp/lms-language-server'
import { createTaskListLangServices } from './task-list-lang-module'
import { startLangiumModelServer } from '../langium-model-server/source/source-model-server'
import { promisify } from 'util'

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all)

// Inject the shared services and language-specific services
const { shared, TaskList } = createTaskListLangServices({ connection, ...NodeFileSystem })

// Start the language server with the shared services and Langium Model Server specific services
startLMSLanguageServer(shared, TaskList)

// Start the model server, which uses the same LMS specific services as LS launched above
const modelServer = startLangiumModelServer(TaskList)
connection.onShutdown(promisify(modelServer.close))
