import { getDocument } from 'langium'
import { AbstractSemanticIndexManager } from '../../../langium-model-server/semantic/semantic-manager'
import type { ModelAwareSemanticIndex } from '../../../langium-model-server/semantic/semantic-model-index'
import type { Task } from '../../generated/ast'
import { SemanticModel } from './task-list-semantic-model'
import { SemanticModelIndex } from './task-list-semantic-model-index'
import type { Valid } from '../../../langium-model-server/semantic/semantic-model'

/**
 * Stores {@link SemanticModel} per URI of Langium-managed TextDocument.
 * It has control over all {@link SemanticModelIndex}es existing. Therefore, it is a point of contact
 * to fetch semantic elements globally, i.e., searching through all the managed files.
 * See {@link getTaskId} for example.
 */
export class TaskListSemanticIndexManager extends AbstractSemanticIndexManager<SemanticModelIndex> {

    public getTaskId(task: Valid<Task>): string {
        const taskId = this.getSemanticModelIndex(getDocument(task)).getTaskIdByName(task.name)
        if (!taskId) {
            //FIXME: What should you really do if it can't find id for Valid target Task?
            // Possible cases: only if 2 files are modified simultaneously, I suppose,
            // because each time LS loads, it performs semantic reconciliation phase for all the documents
            throw new Error('Can\'t find Valid target Task')
        }
        return taskId
    }

    protected override loadSemanticModelToIndex(languageDocumentUri: string): ModelAwareSemanticIndex<SemanticModelIndex> {
        const semanticModel = this.semanticModelStorage.loadSemanticModelFromFile(languageDocumentUri, SemanticModel.is)
        return new AccessibleSemanticModelIndex(semanticModel)
    }

}

/**
 * Hidden class with the only purpose to reveal {@link SemanticModel}
 * wrapped with {@link SemanticModelIndex} to persist it to the file
 * by {@link SemanticModelStorage}.
 *
 * Since {@link SemanticIndexManager} is the only one who persists
 * and removes {@link SemanticModelIndex} from its registry, it is
 * also the only one who is aware of a particular
 * {@link SemanticModelIndex} implementation
 */
class AccessibleSemanticModelIndex extends SemanticModelIndex {

    public override get model(): SemanticModel {
        return this._model
    }
}
