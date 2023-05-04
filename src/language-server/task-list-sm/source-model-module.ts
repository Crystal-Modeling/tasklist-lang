import {
    LangiumServices,
    Module, PartialLangiumServices
} from 'langium';
import { SourceModelValidator } from './validation/source-model-validation';

/**
 * Declaration of custom services - add your own service classes here.
 */
export type SourceModelAddedServices = {
    validation: {
        SourceModelValidator: SourceModelValidator
    }
}

/**
 * Union of Langium default services and your custom services - use this as constructor parameter
 * of custom service classes.
 */
export type SourceModelServices = LangiumServices & SourceModelAddedServices

/**
 * Dependency injection module that overrides Langium default services and contributes the
 * declared custom services. The Langium defaults can be partially specified to override only
 * selected services, while the custom services must be fully specified.
 */
export const SourceModelModule: Module<SourceModelServices, PartialLangiumServices & SourceModelAddedServices> = {
    validation: {
        SourceModelValidator: () => new SourceModelValidator()
    }
};
