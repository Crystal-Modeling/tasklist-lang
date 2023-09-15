import type * as id from '../../../langium-model-server/identity/model'

export type TaskIdentity = id.Indexed<id.AstNodeSemanticIdentity>

export type TransitionDerivativeName = id.SemanticDerivativeName & [sourceTaskId: string, targetTaskId: string]
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
export type TransitionIdentity = id.Indexed<id.DerivativeSemanticIdentity<TransitionDerivativeName>>
