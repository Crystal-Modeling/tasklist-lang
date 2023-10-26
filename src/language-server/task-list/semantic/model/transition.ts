import * as sem from '../../../../langium-model-server/semantic/model'
import type * as ast from '../../../generated/ast'
import type * as identity from '../../identity/model'
import type { IdentifiedTask } from './task'

export type IdentifiedTransition = sem.Identified<sem.Validated<Transition & TransitionIdentifiedProperties>, identity.TransitionName>

export type TransitionIdentifiedProperties = {
    sourceTask: IdentifiedTask,
    targetTask: IdentifiedTask
}

export interface Transition extends ast.Transition {
    sourceTask: sem.Validated<ast.Task>,
    targetTask: sem.Validated<ast.Task>,
    readonly $containerIndex: number;
}

export namespace Transition {

    export function initProperties(transition: ast.Transition & { $container: sem.Validated<ast.Task>, targetTaskRef: sem.ResolvedReference<sem.Validated<ast.Task>> }): Transition {
        if (transition.$containerIndex === undefined) {
            throw new Error('Expected Transition containerIndex to be defined')
        }
        return Object.assign(transition, { sourceTask: transition.$container, targetTask: transition.targetTaskRef.ref, $containerIndex: transition.$containerIndex })
    }

    export function properties(sourceTask: IdentifiedTask, targetTask: IdentifiedTask): TransitionIdentifiedProperties {
        return {
            sourceTask,
            targetTask,
        }
    }

    export function assertIdentifiedProperties(transition: sem.Validated<Transition>): transition is sem.Validated<Transition & TransitionIdentifiedProperties> {
        if (!sem.Identified.is(transition.sourceTask) || !sem.Identified.is(transition.targetTask)) {
            throw new Error(`Expected Transition properties to be identified, but got sourceTask=${transition.sourceTask} and targetTask=${transition.targetTask}`)
        }
        return true
    }

}
