import type * as ast from '../../../generated/ast'
import type * as sem from '../../../../langium-model-server/semantic/model'
import type { NewModel } from '../../../../langium-model-server/lms/model'

export interface Task {
    id: string
    name: string
    content: string
}

export namespace Task {

    export function create(task: sem.Identified<ast.Task>): Task {
        return {
            id: task.id,
            name: task.name,
            content: task.content
        }
    }

    export function serialize(task: NewModel<Task>): string {
        return `task ${task.name} "${task.content}"`
    }
}

