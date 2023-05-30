import type { DefaultSharedModuleContext,
    LangiumSharedServices
} from 'langium'
import {
    createDefaultModule, createDefaultSharedModule, DocumentState, inject,
    interruptAndCheck
} from 'langium'
import { TaskListGeneratedModule, TaskListLangGeneratedSharedModule } from './generated/module'
import type { TaskListServices } from './task-list/task-list-module'
import { TaskListModule } from './task-list/task-list-module'
import { registerValidationChecks } from './task-list/validation/task-list-validation'
import { isTaskListDocument } from './task-list/workspace/documents'

/**
 * Create the full set of services required by Langium.
 *
 * First inject the shared services by merging two modules:
 *  - Langium default shared services
 *  - Services generated by langium-cli
 *
 * Then inject the language-specific services by merging three modules:
 *  - Langium default language-specific services
 *  - Services generated by langium-cli
 *  - Services specified in this file
 *
 * @param context Optional module context with the LSP connection
 * @returns An object wrapping the shared services and the language-specific services
 */
export function createTaskListLangServices(context: DefaultSharedModuleContext): {
    shared: LangiumSharedServices,
    TaskList: TaskListServices
} {
    const shared = inject(
        createDefaultSharedModule(context),
        TaskListLangGeneratedSharedModule
    )
    const TaskList = inject(
        createDefaultModule({ shared }),
        TaskListGeneratedModule,
        TaskListModule
    )
    addSemanticReconciliationPhase(shared, TaskList)
    shared.ServiceRegistry.register(TaskList)
    registerValidationChecks(TaskList)
    return { shared, TaskList }
}

function addSemanticReconciliationPhase(sharedServices: LangiumSharedServices, taskListServices: TaskListServices) {
    const documentBuilder = sharedServices.workspace.DocumentBuilder
    documentBuilder.onBuildPhase(DocumentState.Validated, async (documents, cancelToken) => {
        console.debug('====== SEMANTIC RECONCILIATION PHASE ======')
        for (const document of documents) {
            if (isTaskListDocument(document)) {
                await interruptAndCheck(cancelToken)
                const semanticReconciler = taskListServices.semantic.TaskListSemanticModelReconciler
                semanticReconciler.reconcileSemanticWithLangiumModel(document)
            }

        }
    })
}
