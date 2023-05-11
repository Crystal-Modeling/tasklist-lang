
export namespace SemanticModel {
    export function is(object: any): object is SemanticModel {
        if (typeof object.id === 'string' && object.tasks && object.transitions) {
            return true;
        }
        return false;
    }
}

export interface SemanticModel {
    id: string,
    tasks: { [ID: string]: SemanticTask },
    transitions: { [ID: string]: SemanticTransition }
}

export interface SemanticTask {
    name: string
}

export interface SemanticTransition {
    sourceTaskId: string,
    targetTaskId: string
}