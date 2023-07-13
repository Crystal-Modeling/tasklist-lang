import type { Module } from 'langium'
import type { LangiumModelServerServices, PartialLangiumModelServerServices } from '../../langium-model-server/services'
import { TaskListValidator } from '../task-list/validation/task-list-validation'
import type { TaskListIdentityIndex } from './semantic/task-list-identity-index'
import { TaskListIdentityManager } from './semantic/task-list-identity-manager'
import { TaskListIdentityReconciler } from './semantic/task-list-identity-reconciler'
import { TaskListIdentityStorage } from './semantic/task-list-identity-storage'
import { TaskListSemanticDomain } from './semantic/task-list-semantic-domain'
import type * as source from './source/model'
import { TaskListSourceModelService } from './source/task-list-source-model-service'
import { TaskListSourceUpdateCombiner } from './source/task-list-source-update-combiner'
import { TaskListSourceUpdateManager } from './source/task-list-source-update-manager'
import type { TaskListDocument } from './workspace/documents'
import { isTaskListDocument } from './workspace/documents'

/**
 * Declaration of custom services - add your own service classes here.
 */
export type TaskListAddedServices = {
    validation: {
        TaskListValidator: TaskListValidator
    },
    semantic: {
        // Redefining the type of IdentityManager to be used in TaskListIdentityReconciler
        IdentityManager: TaskListIdentityManager
    },
    source: {
        // Redefining the type
        SourceUpdateManager: TaskListSourceUpdateManager
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type TaskListServices = LangiumModelServerServices<source.Model, TaskListIdentityIndex, TaskListDocument> & TaskListAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const TaskListModule: Module<TaskListServices, PartialLangiumModelServerServices<source.Model, TaskListIdentityIndex, TaskListDocument> & TaskListAddedServices> = {
    validation: {
        TaskListValidator: () => new TaskListValidator()
    },
    workspace: {
        LmsDocumentGuard: () => isTaskListDocument
    },
    semantic: {
        IdentityStorage: (services) => new TaskListIdentityStorage(services),
        IdentityManager: (services) => new TaskListIdentityManager(services),
        IdentityReconciler: (services) => new TaskListIdentityReconciler(services),
        SemanticDomainFactory: () => TaskListSemanticDomain.create,
    },
    source: {
        SourceModelService: (services) => new TaskListSourceModelService(services),
        SourceUpdateManager: () => new TaskListSourceUpdateManager(),
        SourceUpdateCombiner: () => new TaskListSourceUpdateCombiner(),
    },
}
