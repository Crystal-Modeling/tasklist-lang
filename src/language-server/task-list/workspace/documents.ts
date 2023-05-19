import { LangiumDocument } from "langium";
import { Model, Task, isModel } from "../../generated/ast";

/**
 * A Langium document holds the parse result (AST and CST) and any additional state that is derived
 * from the AST, e.g. the result of scope precomputation.
 */
export interface TaskListDocument extends LangiumDocument<Model> {
    /**
     * This property is initialized during Validation phase to be not considered during Semantic Reconciliation phase
     */
    incorrectlyNamedTasks ?: Set<Task>
}

export function isTaskListDocument(document: LangiumDocument): document is TaskListDocument {
    return isModel(document.parseResult.value);
}