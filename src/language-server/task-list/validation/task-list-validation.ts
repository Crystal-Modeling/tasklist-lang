import type { ValidationAcceptor, ValidationChecks } from 'langium'
import { MultiMap } from 'langium'
import type { Model, Task, TaskListLangAstType } from '../../generated/ast'
import { isTask } from '../../generated/ast'
import type { TaskListServices } from '../task-list-module'
import { getTaskListDocument } from '../workspace/documents'

/**
 * Register custom validation checks.
 */
export function registerValidationChecks(services: TaskListServices) {
    const registry = services.validation.ValidationRegistry
    const validator = services.validation.TaskListValidator
    const checks: ValidationChecks<TaskListLangAstType> = {
        Model: validator.checkModelHasUniqueTasks,
        Task: [
            validator.checkTaskHasUniqueReferences,
            validator.checkTaskContentShouldStartWithCapital,
            validator.checkTaskDoesNotReferenceItself
        ]
    }
    registry.register(checks, validator)
}

/**
 * Implementation of custom validations.
 */
export class TaskListValidator {

    checkModelHasUniqueTasks(model: Model, accept: ValidationAcceptor): void {
        const tasksByName = new MultiMap<string, Task>()
        const tasksWithEmptyName: Task[] = []
        const tasksByContent = new MultiMap<string, Task>()
        model.tasks.forEach(task => {
            tasksByName.add(task.name, task)
            tasksByContent.add(task.content, task)
            if (!task.name) {
                tasksWithEmptyName.push(task)
            }
        })

        const incorrectlyNamedTasks = tasksByName.entriesGroupedByKey().filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks.splice(1))

        incorrectlyNamedTasks.forEach(task => {
            accept('error', `Task must have unique name, but found another task with name [${task.name}]`,
                { node: task, property: 'name' })
        })

        getTaskListDocument(model).semanticDomain?.validateTasksForModel(model, incorrectlyNamedTasks
            .concat(tasksWithEmptyName)
            .toSet())

        tasksByContent.entriesGroupedByKey()
            .filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks)
            .forEach(task => {
                accept('warning', 'Task should have unique content',
                    { node: task, property: 'content' })
            })
    }

    checkTaskHasUniqueReferences(task: Task, accept: ValidationAcceptor): void {
        const referenceNames = new Set<string>()
        const nonUniqueReferenceIndices = new Set<number>()
        for (let index = 0; index < task.references.length; index++) {
            const reference = task.references[index]
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
        getTaskListDocument(task).semanticDomain?.validateReferencesForTask(task, nonUniqueReferenceIndices)
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

    checkTaskDoesNotReferenceItself(task: Task, accept: ValidationAcceptor): void {
        for (let index = 0; index < task.references.length; index++) {
            const ref = task.references[index]
            if (isTask(ref.ref) && ref.ref.name === task.name) {
                accept('error', 'Task cannot reference itself',
                    { node: task, property: 'references', index })
            }
        }
    }
}
