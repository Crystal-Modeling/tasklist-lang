import type * as ast from '../../../generated/ast'
import type * as semantic from '../../semantic/task-list-semantic-model'

export interface Task {
    id: string
    name: string
    content: string
}

export namespace Task {

    export function create(semanticTask: semantic.SemanticTask, task?: ast.Task): Task {
        return {
            id: semanticTask.id,
            name: semanticTask.name,
            content: task?.content ?? ''
        }
    }
}

