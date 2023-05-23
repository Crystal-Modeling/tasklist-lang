import { MultiMap, ValidationAcceptor, ValidationChecks, getDocument } from 'langium';
import { Model, Task, TaskListLangAstType, isTask } from '../../generated/ast';
import { TaskListServices } from '../task-list-module';
import { isTaskListDocument } from '../workspace/documents';

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: TaskListServices) {
    const registry = services.validation.ValidationRegistry;
    const validator = services.validation.TaskListValidator;
    const checks: ValidationChecks<TaskListLangAstType> = {
        Model: validator.checkModelHasUniqueTasks,
        Task: [
            validator.checkTaskContentShouldStartWithCapital,
            validator.checkTaskHasUniqueReferences,
            validator.checkTaskDoesNotReferenceItself
        ]
    };
    registry.register(checks, validator);
}

/**
 * Implementation of custom validations.
 */
export class TaskListValidator {

    checkModelHasUniqueTasks(model: Model, accept: ValidationAcceptor): void {
        const tasksByName = new MultiMap<string, Task>()
        const tasksByContent = new MultiMap<string, Task>()
        model.tasks.forEach(task => {
            tasksByName.add(task.name, task)
            tasksByContent.add(task.content, task)
        })

        const incorrectlyNamedTasks = tasksByName.entriesGroupedByKey().filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks.splice(1))
            .toSet()
        incorrectlyNamedTasks.forEach(task => {
            accept('error', `Task must have unique name, but found another task with name [${task.name}]`,
                { node: task, property: 'name' })
        })
        this.setSemanticallyInvalidTasks(model, incorrectlyNamedTasks)

        tasksByContent.entriesGroupedByKey().filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks)
            .forEach(task => {
                accept('warning', 'Task should have unique content',
                    { node: task, property: 'content' })
            })
    }

    checkTaskContentShouldStartWithCapital(task: Task, accept: ValidationAcceptor): void {
        if (task.content) {
            const firstChar = task.content.substring(0, 1)
            if (firstChar.toUpperCase() !== firstChar) {
                accept('warning', 'Task content should start with a capital.',
                    { node: task, property: 'content' })
            }
        }
    }

    checkTaskHasUniqueReferences(task: Task, accept: ValidationAcceptor): void {
        const referenceNames = new Set<string>()
        const nonUniqueReferenceIndices = new Set<number>()
        for (let index = 0; index < task.references.length; index++) {
            const reference = task.references[index];
            if (isTask(reference.ref)) {
                const referencedName = reference.ref.name
                if (referenceNames.has(referencedName)) {
                    accept('error', 'Task cannot reference another task more than once',
                        { node: task, property: 'references', index })
                    nonUniqueReferenceIndices.add(index)
                } else {
                    referenceNames.add(referencedName)
                }
            }
        }
        this.setSemanticallyInvalidReferences(task, nonUniqueReferenceIndices)
    }

    checkTaskDoesNotReferenceItself(task: Task, accept: ValidationAcceptor): void {
        for (let index = 0; index < task.references.length; index++) {
            const ref = task.references[index];
            if (isTask(ref.ref) && ref.ref.name === task.name) {
                accept('error', 'Task cannot reference itself',
                    { node: task, property: 'references', index })
            }
        }
    }

    private setSemanticallyInvalidTasks(model: Model, semanticallyInvalidTasks: Set<Task>) {
        const document = getDocument(model)
        //HACK: This actually is always true, or should be
        if (isTaskListDocument(document)) {
            document.semanticallyInvalidTasks = semanticallyInvalidTasks
        }
    }

    private setSemanticallyInvalidReferences(task: Task, newInvalidReferenceIndices: Set<number>): void {
        const document = getDocument(task)
        //HACK: This actually is always true, or should be
        if (isTaskListDocument(document)) {
            document.semanticallyInvalidReferences ??= new Map()
            document.semanticallyInvalidReferences.set(task, newInvalidReferenceIndices)
        }
    }
}
