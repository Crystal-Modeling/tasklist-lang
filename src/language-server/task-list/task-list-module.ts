import type { Module } from 'langium'
import type { LangiumModelServerServices, PartialLangiumModelServerServices } from '../../langium-model-server/services'
import { TaskListValidator } from '../task-list/validation/task-list-validation'
import type { TaskListIdentityIndex } from './semantic/task-list-identity-index'
import { TaskListIdentityManager } from './semantic/task-list-identity-manager'
import { TaskListIdentityReconciler } from './semantic/task-list-identity-reconciler'
import { TaskListIdentityStorage } from './semantic/task-list-identity-storage'
import { TaskListSemanticDomain } from './semantic/task-list-semantic-domain'
import type * as source from './lms/model'
import { TaskListLangiumModelServerFacade } from './lms/task-list-facade'
import { TaskListModelUpdateCombiner } from './lms/task-list-model-update-combiner'
import { TaskListModelUpdateCalculators } from './lms/task-list-model-update-calculation'
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
    lms: {
        // Redefining the type
        ModelUpdateCalculators: TaskListModelUpdateCalculators
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
    lms: {
        LangiumModelServerFacade: (services) => new TaskListLangiumModelServerFacade(services),
        ModelUpdateCalculators: () => new TaskListModelUpdateCalculators(),
        ModelUpdateCombiner: () => new TaskListModelUpdateCombiner(),
    },
}
