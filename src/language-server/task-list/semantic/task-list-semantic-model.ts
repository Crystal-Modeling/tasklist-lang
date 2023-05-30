import * as uuid from 'uuid'
import { isDefinedObject, isMappedObject } from '../../../langium-model-server/type-util'
import type { Task } from '../../generated/ast'

export interface SemanticModel {
    id: string
    tasks: { [ID: string]: SemanticTask }
    transitions: { [ID: string]: SemanticTransition }
}

export interface SemanticTask {
    id: string
    name: string
}

export interface SemanticTransition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace SemanticModel {
    export function is(obj: unknown): obj is SemanticModel {
        if (!isDefinedObject(obj)) {
            return false
        }
        if (typeof obj.id !== 'string'
            || !isMappedObject(obj.tasks, 'string', isSemanticTask)
            || !isMappedObject(obj.transitions, 'string', isSemanticTransition)) {
            return false
        }

        return true
    }

    function isSemanticTask(obj: unknown): obj is SemanticTask {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.name === 'string'
    }

    function isSemanticTransition(obj: unknown): obj is SemanticTransition {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
    }

    export function newModel(): SemanticModel {
        return {
            id: uuid.v4(),
            tasks: {},
            transitions: {}
        }
    }

    export function newTask(task: Task): SemanticTask {
        return {
            id: uuid.v4(),
            name: task.name
        }
    }

    export function newTransition(sourceTaskId: string, targetTaskId: string): SemanticTransition {
        return {
            id: uuid.v4(),
            sourceTaskId,
            targetTaskId
        }
    }
}
