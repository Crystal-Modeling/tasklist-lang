import type { AstNode, LangiumDocument } from 'langium'
import { DefaultSourceModelService } from '../../../langium-model-server/source/source-model-service'
import type { SemanticModelIndex } from '../semantic/task-list-semantic-model-index'
import { isTaskListDocument } from '../workspace/documents'
import * as lms from './model'

export class TaskListSourceModelService extends DefaultSourceModelService<lms.Model, SemanticModelIndex> {

    protected override getSourceModelFileExtension(): string {
        //HACK: Hardcoded Langium Document file extension (available also in Langium config)
        return 'tasks'
    }

    protected override combineSemanticModelWithAst(semanticModelIndex: SemanticModelIndex,
        langiumDocument: LangiumDocument<AstNode>): lms.Model {

        const sourceModel = lms.Model.create(semanticModelIndex.id)

        if (isTaskListDocument(langiumDocument)) {
            //HACK: Relying on the fact that semanticDomain is initialized during previous phases
            const semanticDomain = langiumDocument.semanticDomain!
            const model = langiumDocument.parseResult.value

            const existingUnusedSemanticTasks = semanticModelIndex.tasksByName
            for (const task of semanticDomain.getValidTasks(model)) {
                const semanticTask = existingUnusedSemanticTasks.get(task.name)
                if (semanticTask) {
                    existingUnusedSemanticTasks.delete(task.name)
                    sourceModel.tasks.push(lms.Task.create(semanticTask, task))
                }//COMMENT: `else` should never actually happen
            }
            //COMMENT: Actually, if AST and Semantic models are reconciled, `existingUnusedSemanticTasks.values()` will be empty
            for (const unusedSemanticTask of existingUnusedSemanticTasks.values()) {
                sourceModel.tasks.push(lms.Task.create(unusedSemanticTask))
            }

            for (const semanticTransition of semanticModelIndex.transitions) {
                sourceModel.transitions.push(lms.Transition.create(semanticTransition))
            }
        }
        //COMMENT: This should never actually happen
        return sourceModel
    }
}
