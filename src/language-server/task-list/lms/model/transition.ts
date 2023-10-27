import { Update, type Creation, type ElementUpdate } from '../../../../langium-model-server/lms/model'
import { isDefinedObject } from '../../../../langium-model-server/utils/types'
import type * as semantic from '../../semantic/model'
import type * as identity from '../../identity/model'

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function create(transition: semantic.IdentifiedTransition): Transition {
        return {
            id: transition.$identity.id,
            sourceTaskId: transition.$props.sourceTask.$identity.id,
            targetTaskId: transition.$props.targetTask.$identity.id
        }
    }

    export function isNew(obj: unknown): obj is Creation<Transition> {
        return isDefinedObject(obj)
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
    }

    export function applyChanges(update: ElementUpdate<Transition>,
        previous: semantic.IdentifiedTransition | identity.TransitionIdentity,
        current: semantic.IdentifiedTransition
    ): void {
        if (previous !== current.$identity) {
            const previousModel = previous as semantic.IdentifiedTransition
            Update.assignIfUpdated(update, 'sourceTaskId', previousModel.$props.sourceTask.$identity.id, current.$props.sourceTask.$identity.id)
            Update.assignIfUpdated(update, 'targetTaskId', previousModel.$props.targetTask.$identity.id, current.$props.targetTask.$identity.id)
        } else {
            console.info(`Can't compare attributes of Transition '${current.$identity.id}' with name=${current.$identity.name}: previous semantic Transition is missing`)
            Update.assign(update, 'sourceTaskId', current.$props.sourceTask.$identity.id)
            Update.assign(update, 'targetTaskId', current.$props.targetTask.$identity.id)
        }
    }

}
