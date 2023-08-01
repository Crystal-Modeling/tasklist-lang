import { AbstractSourceModelService } from '../../../langium-model-server/lms/source-model-service'
import type { LmsDocument } from '../../../langium-model-server/workspace/documents'
import type { TaskListIdentityIndex } from '../semantic/task-list-identity-index'
import type { TaskListDocument } from '../workspace/documents'
import { isTaskListDocument } from '../workspace/documents'
import { Model, Task, Transition } from './model'

export class TaskListSourceModelService extends AbstractSourceModelService<Model, TaskListIdentityIndex, TaskListDocument> {

    protected override convertSemanticModelToSourceModel(lmsDocument: LmsDocument): Model | undefined {

        if (!isTaskListDocument(lmsDocument) || !lmsDocument.semanticDomain?.identifiedRootNode) {
            return undefined
        }
        const sourceModel = Model.create(lmsDocument.semanticDomain?.identifiedRootNode)
        for (const task of lmsDocument.semanticDomain.getIdentifiedTasks()) {
            sourceModel.tasks.push(Task.create(task))
        }

        for (const transition of lmsDocument.semanticDomain.getIdentifiedTransitions()) {
            sourceModel.transitions.push(Transition.create(transition))
        }
        return sourceModel
    }
}
