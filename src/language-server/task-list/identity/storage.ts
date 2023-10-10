import type { TaskListIdentityIndex } from '.'
import * as id from '../../../langium-model-server/identity/model'
import type { IdentityStorage } from '../../../langium-model-server/identity/storage'
import { AbstractIdentityStorage } from '../../../langium-model-server/identity/storage'
import { isArray, isDefinedObject } from '../../../langium-model-server/utils/types'
import type * as source from '../lms/model'
import type { TaskListDocument } from '../workspace/documents'
import { TransitionDerivativeName } from './model'

export class TaskListIdentityStorage extends AbstractIdentityStorage<source.Model, TaskListIdentityIndex, TaskListDocument> implements IdentityStorage {

    protected override createIdentityForEmptyFile(): IdentityModel {
        return {
            id: id.SemanticIdentifier.generate(),
            tasks: [],
            transitions: []
        }
    }
}

export interface Task {
    id: string
    name: string
}

export namespace Task {
    export function of(taskIdentity: id.AstNodeIdentity): Task {
        return {
            id: taskIdentity.id,
            name: taskIdentity.name
        }
    }
}

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function of(transitionIdentity: id.DerivativeSemanticIdentity<TransitionDerivativeName>): Transition {
        return {
            id: transitionIdentity.id,
            ...TransitionDerivativeName.toProperties(transitionIdentity.name)
        }
    }
}

export interface IdentityModel {
    id: string
    tasks: Task[]
    transitions: Transition[]
}

export namespace IdentityModel {
    export function is(obj: unknown): obj is IdentityModel {
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
}
