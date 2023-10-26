import type { ValidationAcceptor, ValidationChecks } from 'langium'
import { MultiMap } from 'langium'
import { ResolvedReference } from '../../../langium-model-server/semantic/model'
import type { Model, Task, TaskListLangAstType, Transition } from '../../generated/ast'
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
            validator.checkTaskHasUniqueTransitions,
            validator.checkTaskNameMustStartWithLowercase,
            validator.checkTaskContentShouldStartWithCapital,
        ],
        Transition: [
            validator.checkTransitionDoesNotReferenceContainer
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
        const tasksByContent = new MultiMap<string, Task>()
        const invalidTasks = new Set<Task>()
        model.tasks.forEach(task => {
            tasksByName.add(task.name, task)
            tasksByContent.add(task.content, task)
            if (!task.name) {
                invalidTasks.add(task)
            }
        })

        tasksByName.entriesGroupedByKey().filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks.splice(1))
            .forEach(task => {
                accept('error', `Task must have unique name, but found another task with name [${task.name}]`,
                    { node: task, property: 'name' })
                invalidTasks.add(task)
            })

        getTaskListDocument(model).semanticDomain?.validateTasksForModel(model, invalidTasks)

        tasksByContent.entriesGroupedByKey()
            .filter(([, tasks]) => tasks.length > 1)
            .flatMap(([, tasks]) => tasks)
            .forEach(task => {
                accept('warning', 'Task should have unique content',
                    { node: task, property: 'content' })
            })
    }

    checkTaskHasUniqueTransitions(task: Task, accept: ValidationAcceptor): void {
        const referenceTasks = new Set<Task>()
        const invalidTransitions = new Set<Transition>()
        for (const transition of task.transitions) {
            if (ResolvedReference.is(transition.targetTaskRef)) {
                const targetTask = transition.targetTaskRef.ref
                if (referenceTasks.has(targetTask)) {
                    accept('error', 'Transitions from the same Task can not reference another Task more than once',
                        { node: transition, property: 'targetTaskRef' })
                    invalidTransitions.add(transition)
                } else {
                    referenceTasks.add(targetTask)
                }
            }
        }
        getTaskListDocument(task).semanticDomain?.validateTransitionsForTask(task, invalidTransitions)
    }

    checkTaskNameMustStartWithLowercase(task: Task, accept: ValidationAcceptor): void {
        if (task.name) {
            const firstChar = task.name.substring(0, 1)
            if (firstChar.toLowerCase() !== firstChar) {
                accept('error', 'Task name must start with a lowercase.',
                    { node: task, property: 'name' })
            }
        }
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

    checkTransitionDoesNotReferenceContainer(transition: Transition, accept: ValidationAcceptor): void {
        if (ResolvedReference.is(transition.targetTaskRef) && transition.targetTaskRef.ref === transition.$container) {
            accept('error', 'Transition cannot reference its container Task', { node: transition, property: 'targetTaskRef' })
        }
    }
}
