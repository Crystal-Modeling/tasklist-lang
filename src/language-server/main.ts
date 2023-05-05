import { NodeFileSystem } from 'langium/node';
import { createConnection, ProposedFeatures } from 'vscode-languageserver/node';
import { startSourceModelLanguageServer } from '../source-model-server/lsp/source-model-language-server';
import { createTaskListLangServices } from './task-list-lang-module';

// Create a connection to the client
const connection = createConnection(ProposedFeatures.all);

// Inject the shared services and language-specific services
const { shared, TaskList } = createTaskListLangServices({ connection, ...NodeFileSystem });

// Start the language server with the shared services
startSourceModelLanguageServer(shared, TaskList.sourceModel)
