import type * as ast from '../../../generated/ast'
import type * as id from '../../../../langium-model-server/semantic/identity'

export interface Task {
    id: string
    name: string
    content: string
}

export namespace Task {

    export function create(task: id.Identified<ast.Task>): Task {
        return {
            id: task.id,
            name: task.name,
            content: task.content
        }
    }
}

