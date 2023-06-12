import type { LangiumDocument } from 'langium'
import { getDocument } from 'langium'
import type * as ast from '../../generated/ast'
import { isModel } from '../../generated/ast'
import type { TaskListSemanticDomain } from '../semantic/task-list-semantic-domain'

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export interface TaskListDocument extends LangiumDocument<ast.Model> {
    /**
     * This property is initialized during Validation phase to be considered during Semantic Reconciliation phase
     */
    semanticDomain?: TaskListSemanticDomain
}

export function isTaskListDocument(document: LangiumDocument): document is TaskListDocument {
    return isModel(document.parseResult.value)
}

export function getTaskListDocument(node: ast.Model | ast.Task): TaskListDocument {
    return getDocument(node)
}
