import * as sem from '../../../../langium-model-server/semantic/model'
import type * as ast from '../../../generated/ast'
import type * as identity from '../../identity/model'
import type { IdentifiedTask } from './task'

export type IdentifiedTransition = sem.Identified<Transition<IdentifiedTransitionProperties>, identity.TransitionName>

export type Transition<P extends TransitionProperties = TransitionProperties> = sem.Customized<ast.Transition, P>

export type TransitionProperties = {
    sourceTask: sem.Validated<ast.Task>,
    targetTask: sem.Validated<ast.Task>,
}

export type IdentifiedTransitionProperties = {
    sourceTask: IdentifiedTask,
    targetTask: IdentifiedTask
}

export namespace Transition {

    export function initProperties(transition: ast.Transition & { $container: sem.Validated<ast.Task>, targetTaskRef: sem.ValidatedReference<ast.Task> }): Transition {

        return sem.Customized.customize(transition, { sourceTask: transition.$container, targetTask: transition.targetTaskRef.ref })
    }

    export function properties(sourceTask: IdentifiedTask, targetTask: IdentifiedTask): IdentifiedTransitionProperties {
        return {
            sourceTask,
            targetTask,
        }
    }

    export function assertIdentifiedProperties(transition: sem.Validated<Transition>): transition is sem.Validated<Transition<IdentifiedTransitionProperties>> {
        if (!sem.Identified.is(transition.$props.sourceTask) || !sem.Identified.is(transition.$props.targetTask)) {
            throw new Error(`Expected Transition properties to be identified, but got sourceTask=${transition.$props.sourceTask} and targetTask=${transition.$props.targetTask}`)
        }
        return true
    }

}
