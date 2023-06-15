import type { AstNode, LangiumDocument } from 'langium'
import { AbstractSourceModelService } from '../../../langium-model-server/source/source-model-service'
import type { TaskListIdentityIndex } from '../semantic/task-list-identity-index'
import { isTaskListDocument } from '../workspace/documents'
import { Model, Task, Transition } from './model'

export class TaskListSourceModelService extends AbstractSourceModelService<Model, TaskListIdentityIndex> {

    protected override combineSemanticModelWithAst(semanticModelIndex: TaskListIdentityIndex,
        langiumDocument: LangiumDocument<AstNode>): Model {

        const sourceModel = Model.create(semanticModelIndex.id)

        if (isTaskListDocument(langiumDocument)) {
            //HACK: Relying on the fact that semanticDomain is initialized during previous phases
            const semanticDomain = langiumDocument.semanticDomain!
            for (const task of semanticDomain.getIdentifiedTasks()) {
                sourceModel.tasks.push(Task.create(task))
            }

            for (const transition of semanticDomain.getIdentifiedTransitions()) {
                sourceModel.transitions.push(Transition.create(transition))
            }
        }
        return sourceModel
    }
}
