import * as uuid from 'uuid'
import type { DerivativeNameBuilder } from '../../../langium-model-server/semantic/identity'
import { isArray, isDefinedObject } from '../../../langium-model-server/utils/types'

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

export namespace Transition {
    export const KIND = 'Transition'

    export const nameBuilder: Transition.NameBuilder = {
        kind: KIND,
        buildName: name,
    }

    export function name(transition: Transition): TransitionDerivativeName {
        return TransitionDerivativeName.of(transition.sourceTaskId, transition.targetTaskId)
    }

    export interface NameBuilder extends DerivativeNameBuilder<Transition, TransitionDerivativeName> {
        kind: typeof Transition.KIND
    }
}

export type TransitionDerivativeName = [sourceTaskId: string, targetTaskId: string]

export namespace TransitionDerivativeName {
    export function of(sourceTaskId: string, targetTaskId: string): TransitionDerivativeName {
        return [sourceTaskId, targetTaskId]
    }
}

export type TaskListDerivativeNameBuilder = Transition.NameBuilder

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

    export function isTask(obj: unknown): obj is Task {
        return isDefinedObject(obj)
            && typeof obj.id === 'string'
            && typeof obj.name === 'string'
    }

    export function isTransition(obj: unknown): obj is Transition {
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

    export function newTask(name: string): Task {
        return {
            id: uuid.v4(),
            name
        }
    }

    // TODO: Refactor these functions to a dedicated namespaces(?) So that the logic of mapping between Transition args and name is in one place
    export function newTransition(name: TransitionDerivativeName): Transition {
        return {
            id: uuid.v4(),
            sourceTaskId: name[0],
            targetTaskId: name[1]
        }
    }
}
