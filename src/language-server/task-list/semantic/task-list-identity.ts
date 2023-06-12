import * as uuid from 'uuid'
import type { Valid } from '../../../langium-model-server/semantic/identity'
import { isDefinedObject, isMappedObject } from '../../../langium-model-server/utils/types'
import type * as ast from '../../generated/ast'

export type TransitionDerivativeIdentity = [sourceTaskId: string, targetTaskId: string]

export interface Model {
    id: string
    tasks: { [ID: string]: Task }
    transitions: { [ID: string]: Transition }
}

export interface Task {
    id: string
    name: string // Derivative identity of Task (since its Source Model is based on the Task AstNode)
}

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Model {
    export function is(obj: unknown): obj is Model {
        if (!isDefinedObject(obj)) {
            return false
        }
        if (typeof obj.id !== 'string'
            || !isMappedObject(obj.tasks, 'string', isTask)
            || !isMappedObject(obj.transitions, 'string', isTransition)) {
            return false
        }

        return true
    }

    function isTask(obj: unknown): obj is Task {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.name === 'string'
    }

    function isTransition(obj: unknown): obj is Transition {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
    }

    export function newModel(): Model {
        return {
            id: uuid.v4(),
            tasks: {},
            transitions: {}
        }
    }

    export function newTask(task: Valid<ast.Task>): Task {
        return {
            id: uuid.v4(),
            name: task.name
        }
    }

    export function newTransition(transition: TransitionDerivativeIdentity): Transition {
        return {
            id: uuid.v4(),
            sourceTaskId: transition[0],
            targetTaskId: transition[1]
        }
    }
}
