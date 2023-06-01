import type * as semantic from '../../semantic/task-list-semantic-model'

export interface Transition {
    id: string
    sourceTaskId: string
    targetTaskId: string
}

export namespace Transition {
    export function create(semanticTransition: semantic.SemanticTransition): Transition {
        return { ...semanticTransition }
    }
}
