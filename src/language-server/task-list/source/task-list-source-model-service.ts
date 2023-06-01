import type { AstNode, LangiumDocument } from 'langium'
import { DefaultSourceModelService } from '../../../langium-model-server/source/source-model-service'
import type { SemanticModelIndex } from '../semantic/task-list-semantic-model-index'
import type * as lms from './model'

export class TaskListSourceModelService extends DefaultSourceModelService<lms.Model, SemanticModelIndex> {

    //TODO: Implement next
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override combineSemanticModelWithAst(semanticModelIndex: SemanticModelIndex, langiumDocument: LangiumDocument<AstNode>): Model {
        throw new Error('Unimplemented')
    }
}
