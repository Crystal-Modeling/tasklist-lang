import type * as id from '../../../langium-model-server/identity/model'
import type * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'

export type TaskIdentity = id.AstNodeIdentity<ast.Task>

export type TransitionDerivativeName = id.DerivativeIdentityName & [sourceTaskId: string, targetTaskId: string]
export namespace TransitionDerivativeName {

    export function ofProperties({sourceTaskId, targetTaskId}: TransitionDerivativeNameProperties): TransitionDerivativeName {
        return [sourceTaskId, targetTaskId]
    }

    export function of(sourceTaskId: string, targetTaskId: string): TransitionDerivativeName {
        return [sourceTaskId, targetTaskId]
    }

    export function toProperties(name: TransitionDerivativeName): TransitionDerivativeNameProperties {
        return {
            sourceTaskId: name[0],
            targetTaskId: name[1]
        }
    }
}
type TransitionDerivativeNameProperties = {sourceTaskId: string, targetTaskId: string}
export type TransitionIdentity = id.DerivativeSemanticIdentity<semantic.Transition, TransitionDerivativeName>
