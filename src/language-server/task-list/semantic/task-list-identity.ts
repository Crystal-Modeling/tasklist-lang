import * as uuid from 'uuid'
import type * as sem from '../../../langium-model-server/semantic/model'
import type * as semantic from './model'
import { isArray, isDefinedObject } from '../../../langium-model-server/utils/types'
import type * as ast from '../../generated/ast'

export interface Model {
    id: string
    tasks: Task[]
    transitions: Transition[]
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
            || !isArray(obj.tasks, isTask)
            || !isArray(obj.transitions, isTransition)) {
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
            tasks: [],
            transitions: []
        }
    }

    export function newTask(task: sem.Valid<ast.Task>): Task {
        return {
            id: uuid.v4(),
            name: task.name
        }
    }

    export function newTransition(transition: semantic.TransitionDerivativeIdentity): Transition {
        return {
            id: uuid.v4(),
            sourceTaskId: transition[0],
            targetTaskId: transition[1]
        }
    }
}
