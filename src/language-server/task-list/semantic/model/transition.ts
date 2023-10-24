import { findNodeForProperty } from 'langium'
import * as sem from '../../../../langium-model-server/semantic/model'
import type * as ast from '../../../generated/ast'
import type * as identity from '../../identity/model'
import type { IdentifiedTask } from './task'

export type IdentifiedTransition = sem.Identified<sem.Validated<Transition & TransitionIdentifiedProperties>, identity.TransitionName>

export type TransitionIdentifiedProperties = {
    sourceTask: IdentifiedTask,
    targetTask: IdentifiedTask
}

export interface Transition extends sem.ArtificialIndexedAstNode {
    sourceTask: sem.Validated<ast.Task>,
    targetTask: sem.Validated<ast.Task>
}

export namespace Transition {

    export function create(task: sem.Validated<ast.Task>, reference: sem.ResolvedReference<sem.Validated<ast.Task>>, refIndex: number): Transition {
        return {
            sourceTask: task,
            targetTask: reference.ref,
            $type: 'Transition',
            $container: task,
            $containerIndex: refIndex,
            $containerProperty: 'references',
            get $cstNode() {
                return findNodeForProperty(task.$cstNode, 'references', refIndex)
            }
        }
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
