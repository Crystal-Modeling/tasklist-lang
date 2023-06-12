import type * as identity from '../../semantic/task-list-identity'

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function create(semanticId: string, transition: identity.TransitionDerivativeIdentity): Transition {
        return {
            id: semanticId,
            sourceTaskId: transition[0],
            targetTaskId: transition[1]
        }
    }
}
