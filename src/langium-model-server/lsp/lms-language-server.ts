import type { LangiumSharedServices } from 'langium'
import { DefaultLanguageServer, startLanguageServer } from 'langium'
import type { Connection, InitializeParams, InitializeResult } from 'vscode-languageserver'
import { FileChangeType } from 'vscode-languageserver'
import { URI } from 'vscode-uri'
import type { IdentityIndex } from '../identity'
import type { SemanticIdentifier } from '../identity/model'
import { Save } from '../lms/model'
import type { LangiumModelServerAddedServices } from '../services'
import { LmsDocument } from '../workspace/documents'

export class LmsLanguageServer extends DefaultLanguageServer {

    protected override buildInitializeResult(_params: InitializeParams): InitializeResult {
        const initializeResult = super.buildInitializeResult(_params)

        initializeResult.capabilities.workspace = {
            ...initializeResult.capabilities.workspace,
            fileOperations: {
                didRename: { filters: [{ pattern: { glob: '**' } }] }
            }
        }

        return initializeResult
    }
}

/**
 * Entry point function to launch LMS language server.
 * Overrides the default {@link startLanguageServer} adding LS handlers for semantic model
 * @param services Same {@link LangiumSharedServices} used in {@link startLanguageServer}
 * @param lmsServices Additional {@link LangiumModelServerAddedServices} introduced by langium-model-server module
 */
//TODO: When elaborating into a library, make sure LMS is compatible with multiple Langium languages in one server
export function startLMSLanguageServer<SM extends SemanticIdentifier, II extends IdentityIndex<SM>, D extends LmsDocument>(
    services: LangiumSharedServices,
    lmsServices: LangiumModelServerAddedServices<SM, II, D>
): void {
    startLanguageServer(services)
    addIdentityProcessingHandlers(services.lsp.Connection!, lmsServices, services)
}

function addIdentityProcessingHandlers<SM extends SemanticIdentifier, II extends IdentityIndex<SM>, D extends LmsDocument>(
    connection: Connection,
    lmsServices: LangiumModelServerAddedServices<SM, II, D>,
    services: LangiumSharedServices
) {

    const langiumDocuments = services.workspace.LangiumDocuments
    const isLmsDocument = lmsServices.workspace.LmsDocumentGuard
    const identityManager = lmsServices.identity.IdentityManager
    const modelUpdateCalculators = lmsServices.lms.ModelUpdateCalculators
    const lmsSubscriptions = lmsServices.lms.LmsSubscriptions

    connection.onDidSaveTextDocument(params => {
        const lmsUri = URI.parse(params.textDocument.uri)
        if (langiumDocuments.hasDocument(lmsUri)) {
            const document = langiumDocuments.getOrCreateDocument(lmsUri)
            if (isLmsDocument(document) && LmsDocument.isInitialized(document)) {
                const identityIndex = identityManager.getIdentityIndex(document)
                const rootId = document.semanticDomain.rootId
                const modelsPermanentDeletion = modelUpdateCalculators.getOrCreateCalculator(document).clearModelsMarkedForDeletion()
                identityIndex.removeDeletedIdentities(modelsPermanentDeletion)
                lmsSubscriptions.getSubscription(rootId)?.pushModelUpdate(modelsPermanentDeletion)
                identityManager.saveIdentity(params.textDocument.uri)
                lmsSubscriptions.getSubscription(rootId)?.pushAction(Save.create(rootId))
            }
        }
    })

    connection.onDidChangeWatchedFiles(params => {
        for (const event of params.changes) {
            switch (event.type) {
                case FileChangeType.Deleted:
                    identityManager.deleteIdentity(event.uri)
                    break
                default:
                    break
            }
        }
    })

    connection.workspace.onDidRenameFiles(params => {
        console.debug('============= > RENAMED FILES!!!', params.files)
        params.files.forEach(fileRename => {
            identityManager.renameIdentity(fileRename.oldUri, fileRename.newUri)
        })
    })
}
