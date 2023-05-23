import {
    LangiumServices,
    Module, PartialLangiumServices
} from 'langium';
import { SourceModelServices } from '../../source-model-server/source-model-server-module';
import { TaskListValidator } from '../task-list/validation/task-list-validation';
import { TaskListSemanticModelStorage } from './source-model/task-list-semantic-storage';
import { TaskListSemanticIndexManager } from './source-model/task-list-semantic-manager';
import { TaskListSemanticModelReconciler } from './source-model/task-list-semantic-reconciler';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type TaskListAddedServices = {
    validation: {
        TaskListValidator: TaskListValidator
    },
    /**
     * This service is required to leverage SourceModel 'Langium extension' capabilities
     */
    sourceModel: SourceModelServices & {
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
    sourceModel: {
        SemanticModelStorage: () => new TaskListSemanticModelStorage(),
        SemanticIndexManager: (services) => new TaskListSemanticIndexManager(services),
        TaskListSemanticModelReconciler: (services) => new TaskListSemanticModelReconciler(services),
    }
};
