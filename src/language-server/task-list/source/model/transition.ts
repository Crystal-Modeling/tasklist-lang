import type * as semantic from '../../semantic/model'

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function create(transition: semantic.IdentifiedTransition): Transition {
        return {
            id: transition.id,
            sourceTaskId: transition.name[0],
            targetTaskId: transition.name[1]
        }
    }
}
