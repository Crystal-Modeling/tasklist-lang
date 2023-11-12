import type * as id from '../../../langium-model-server/identity/model'
import type { DerivativeIdentityName } from '../../../langium-model-server/identity/identity-name'
import { isDefinedObject } from '../../../langium-model-server/utils/types'
import type * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'

export type TaskIdentity = id.AstNodeIdentity<ast.Task>

export interface TransitionName extends DerivativeIdentityName {
    sourceTaskId: string
    targetTaskId: string
}

export namespace TransitionName {

    export function is(obj: unknown): obj is TransitionName {
        return isDefinedObject(obj)
            && typeof obj.sourceTaskId === 'string'
            && typeof obj.targetTaskId === 'string'
    }

    export function from(newTransition: semantic.IdentifiedTransitionProperties): TransitionName {
        return of(newTransition.sourceTask.$identity.id, newTransition.targetTask.$identity.id)
    }

    export function of(sourceTaskId: string, targetTaskId: string): TransitionName {
        return { sourceTaskId, targetTaskId }
    }

    export function stringify(name: TransitionName): string {
        return `${name.sourceTaskId}|${name.targetTaskId}`
    }

    export function equal(name1: TransitionName, name2: TransitionName): boolean {
        return name1 === name2
            || (name1.sourceTaskId === name2.sourceTaskId && name1.targetTaskId === name2.targetTaskId)
    }
}

export type TransitionIdentity = id.DerivativeIdentity<semantic.Transition<semantic.IdentifiedTransitionProperties>, TransitionName>
