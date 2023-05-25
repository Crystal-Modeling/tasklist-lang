import type { LangiumDocument} from 'langium'
import { getDocument } from 'langium'
import type { Model, Task} from '../../generated/ast'
import { isModel } from '../../generated/ast'

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export interface TaskListDocument extends LangiumDocument<Model> {
    /**
     * This property is initialized during Validation phase to be not considered during Semantic Reconciliation phase
     */
    semanticallyInvalidTasks?: Set<Task>
    semanticallyInvalidReferences?: Map<Task, Set<number>>
}

export function isTaskListDocument(document: LangiumDocument): document is TaskListDocument {
    return isModel(document.parseResult.value)
}

export function getTaskListDocument(node: Model | Task): TaskListDocument {
    return getDocument(node)
}
