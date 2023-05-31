import type { AstNode, LangiumDocument } from 'langium'
import { DefaultSourceModelService } from '../../../langium-model-server/source/source-model-service'
import type { Model } from '../model-server/api-models'
import type { SemanticModelIndex } from '../semantic/task-list-semantic-model-index'

export class TaskListSourceModelService extends DefaultSourceModelService<Model, SemanticModelIndex> {

    //TODO: Implement next
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected override combineSemanticModelWithAst(semanticModelIndex: SemanticModelIndex, langiumDocument: LangiumDocument<AstNode>): Model {
        throw new Error('Unimplemented')
    }
}
