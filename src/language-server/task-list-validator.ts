import { ValidationAcceptor, ValidationChecks } from 'langium';
import { TaskListAstType, Task } from './generated/ast';
import type { TaskListServices } from './task-list-module';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: TaskListServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.TaskListValidator;
    const checks: ValidationChecks<TaskListAstType> = {
        Task: validator.checkTaskStartsWithCapital
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class TaskListValidator {

    checkTaskStartsWithCapital(task: Task, accept: ValidationAcceptor): void {
        if (task.content) {
            const firstChar = task.content.substring(0, 1);
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Task content should start with a capital.', { node: task, property: 'content' });
            }
        }
    }

}
