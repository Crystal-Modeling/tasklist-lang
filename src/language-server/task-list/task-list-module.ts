import type {
    LangiumServices,
    Module, PartialLangiumServices
} from 'langium'
import type { LangiumModelServerAddedServices } from '../../langium-model-server/langium-model-server-module'
import { TaskListValidator } from '../task-list/validation/task-list-validation'
import type { Model } from './source/model'
import { TaskListSemanticIndexManager } from './semantic/task-list-semantic-manager'
import type { SemanticModelIndex } from './semantic/task-list-semantic-model-index'
import { TaskListSemanticModelReconciler } from './semantic/task-list-semantic-reconciler'
import { TaskListSemanticModelStorage } from './semantic/task-list-semantic-storage'
import { TaskListSourceModelService } from './source/task-list-source-model-service'

/**
 * Declaration of custom services - add your own service classes here.
 */
export type TaskListAddedServices = LangiumModelServerAddedServices<Model, SemanticModelIndex> & {
    validation: {
        TaskListValidator: TaskListValidator
    },
    /**
     * These services are required to leverage Langium Model Server (LMS) 'Langium extension' capabilities
     */
    semantic: {
        // Redefining the type of SemanticIndexManager to be used in TaskListSemanticModelReconciler
        SemanticIndexManager: TaskListSemanticIndexManager
        TaskListSemanticModelReconciler: TaskListSemanticModelReconciler
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
        SemanticModelStorage: () => new TaskListSemanticModelStorage(),
        SemanticIndexManager: (services) => new TaskListSemanticIndexManager(services),
        TaskListSemanticModelReconciler: (services) => new TaskListSemanticModelReconciler(services),
    },
    source: {
        SourceModelService: (services) => new TaskListSourceModelService(services)
    }
}
