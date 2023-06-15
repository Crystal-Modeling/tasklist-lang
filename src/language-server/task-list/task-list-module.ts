import type {
    LangiumServices,
    Module, PartialLangiumServices
} from 'langium'
import type { LangiumModelServerAddedServices } from '../../langium-model-server/langium-model-server-module'
import { LmsRenameProvider } from '../../langium-model-server/lsp/lms-rename-provider'
import { TaskListValidator } from '../task-list/validation/task-list-validation'
import type { TaskListIdentityIndex } from './semantic/task-list-identity-index'
import { TaskListIdentityManager } from './semantic/task-list-identity-manager'
import { TaskListIdentityReconciler } from './semantic/task-list-identity-reconciler'
import { TaskListIdentityStorage } from './semantic/task-list-identity-storage'
import type * as source from './source/model'
import { TaskListSourceModelService } from './source/task-list-source-model-service'
import { TaskListSourceUpdateManager } from './source/task-list-source-update-manager'

/**
 * Declaration of custom services - add your own service classes here.
 */
export type TaskListAddedServices = LangiumModelServerAddedServices<source.Model, TaskListIdentityIndex> & {
    validation: {
        TaskListValidator: TaskListValidator
    },
    /**
     * These services are required to leverage Langium Model Server (LMS) 'Langium extension' capabilities
     */
    semantic: {
        // Redefining the type of IdentityManager to be used in TaskListIdentityReconciler
        IdentityManager: TaskListIdentityManager
        TaskListIdentityReconciler: TaskListIdentityReconciler
    },
    source: {
        SourceUpdateManager: TaskListSourceUpdateManager
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type TaskListServices = LangiumServices & TaskListAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const TaskListModule: Module<TaskListServices, PartialLangiumServices & TaskListAddedServices> = {
    validation: {
        TaskListValidator: () => new TaskListValidator()
    },
    semantic: {
        IdentityStorage: (services) => new TaskListIdentityStorage(services),
        IdentityManager: (services) => new TaskListIdentityManager(services),
        TaskListIdentityReconciler: (services) => new TaskListIdentityReconciler(services),
    },
    source: {
        SourceModelService: (services) => new TaskListSourceModelService(services),
        SourceUpdateManager: () => new TaskListSourceUpdateManager(),
    },
    lsp: {
        RenameProvider: (services) => new LmsRenameProvider(services)
    }
}
