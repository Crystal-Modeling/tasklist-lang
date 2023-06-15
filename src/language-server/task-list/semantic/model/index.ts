import type * as id from '../../../../langium-model-server/semantic/identity'

export type TransitionDerivativeIdentity = [sourceTaskId: string, targetTaskId: string]

export type IdentifiedTransition = id.SemanticIdentity & {
    name: TransitionDerivativeIdentity
}

export namespace IdentifiedTransition {
    export function identify(derivativeIdentity: TransitionDerivativeIdentity, semanticId: string): IdentifiedTransition {
        return {
            id: semanticId,
            name: derivativeIdentity,
        }
    }
}
