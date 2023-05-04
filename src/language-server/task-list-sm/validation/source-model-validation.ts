import { ValidationAcceptor, ValidationChecks } from 'langium';
import { STask, TaskListLangAstType } from '../../generated/ast';
import { SourceModelServices } from '../source-model-module';


/**
 * Register custom validation checks.
 */
export function registerSourceModelValidationChecks(services: SourceModelServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.SourceModelValidator;
    const checks: ValidationChecks<TaskListLangAstType> = {
        STask: validator.checkSModelNameShouldStartWithDash
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class SourceModelValidator {

    checkSModelNameShouldStartWithDash(sTask: STask, accept: ValidationAcceptor): void {
        if (sTask.name) {
            const firstChar = sTask.name.substring(0, 1)
            if (firstChar !== '-') {
                accept('warning', 'STask name should start with dash.',
                    { node: sTask, property: 'name' })
            }
        }
    }

}
