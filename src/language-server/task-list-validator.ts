import { ValidationAcceptor, ValidationChecks } from 'langium';
import { TaskListAstType, Person } from './generated/ast';
import type { TaskListServices } from './task-list-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: TaskListServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.TaskListValidator;
    const checks: ValidationChecks<TaskListAstType> = {
        Person: validator.checkPersonStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class TaskListValidator {

    checkPersonStartsWithCapital(person: Person, accept: ValidationAcceptor): void {
        if (person.name) {
            const firstChar = person.name.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Person name should start with a capital.', { node: person, property: 'name' });
            }
        }
    }

}
