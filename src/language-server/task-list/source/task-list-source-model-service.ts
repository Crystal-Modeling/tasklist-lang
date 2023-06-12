import type { AstNode, LangiumDocument } from 'langium'
import { AbstractSourceModelService } from '../../../langium-model-server/source/source-model-service'
import type { SemanticModelIndex } from '../semantic/task-list-semantic-model-index'
import { isTaskListDocument } from '../workspace/documents'
import * as lms from './model'

export class TaskListSourceModelService extends AbstractSourceModelService<lms.Model, SemanticModelIndex> {

    protected override combineSemanticModelWithAst(semanticModelIndex: SemanticModelIndex,
        langiumDocument: LangiumDocument<AstNode>): lms.Model {

        const sourceModel = lms.Model.create(semanticModelIndex.id)

        if (isTaskListDocument(langiumDocument)) {
            //HACK: Relying on the fact that semanticDomain is initialized during previous phases
            const semanticDomain = langiumDocument.semanticDomain!
            for (const task of semanticDomain.getIdentifiedTasks()) {
                sourceModel.tasks.push(lms.Task.create(task))
            }

            for (const [semanticId, transition] of semanticDomain.getIdentifiedTransitions()) {
                sourceModel.transitions.push(lms.Transition.create(semanticId, transition))
            }
        }
        return sourceModel
    }
}
