import { getDocument } from 'langium'
import { AbstractIdentityManager } from '../../../langium-model-server/semantic/identity-manager'
import type { ModelExposedIdentityIndex } from '../../../langium-model-server/semantic/identity-index'
import type * as ast from '../../generated/ast'
import { Model } from './task-list-identity'
import { TaskListIdentityIndex } from './task-list-identity-index'
import type * as sem from '../../../langium-model-server/semantic/model'

/**
 * Stores {@link Model} per URI of Langium-managed TextDocument.
 * It has control over all {@link TaskListIdentityIndex}es existing. Therefore, it is a point of contact
 * to fetch semantic elements globally, i.e., searching through all the managed files.
 * See {@link getTaskId} for example.
 */
export class TaskListIdentityManager extends AbstractIdentityManager<TaskListIdentityIndex> {

    public getTaskId(task: sem.Valid<ast.Task>): string {
        const taskId = this.getIdentityIndex(getDocument(task)).getTaskIdByName(task.name)
        if (!taskId) {
            //FIXME: What should you really do if it can't find id for Valid target Task?
            // Possible cases: only if 2 files are modified simultaneously, I suppose,
            // because each time LS loads, it performs semantic reconciliation phase for all the documents
            throw new Error('Can\'t find Valid target Task')
        }
        return taskId
    }

    protected override loadIdentityToIndex(languageDocumentUri: string): ModelExposedIdentityIndex<TaskListIdentityIndex> {
        const identityModel = this.identityStorage.loadIdentityFromFile(languageDocumentUri, Model.is)
        return new AccessibleTaskListIdentityIndex(identityModel)
    }

}

/**
 * Hidden class with the only purpose to reveal {@link Model}
 * wrapped with {@link TaskListIdentityIndex} to persist it to the file
 * by {@link SemanticModelStorage}.
 *
 * Since {@link SemanticIndexManager} is the only one who persists
 * and removes {@link TaskListIdentityIndex} from its registry, it is
 * also the only one who is aware of a particular
 * {@link TaskListIdentityIndex} implementation
 */
class AccessibleTaskListIdentityIndex extends TaskListIdentityIndex {

    public override get model(): Model {
        return this._model
    }
}
