import type * as sem from '../../../../langium-model-server/semantic/model'
import type * as semantic from '../../semantic/model'

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function create(transition: sem.Identified<semantic.Transition>): Transition {
        return {
            id: transition.id,
            sourceTaskId: transition.name[0],
            targetTaskId: transition.name[1]
        }
    }
}
