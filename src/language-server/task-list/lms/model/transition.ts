import type { Creation } from '../../../../langium-model-server/lms/model'
import type * as sem from '../../../../langium-model-server/semantic/model'
import { isDefinedObject } from '../../../../langium-model-server/utils/types'
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

    export function isNew(obj: unknown): obj is Creation<Transition> {
        return isDefinedObject(obj)
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
    }
}
