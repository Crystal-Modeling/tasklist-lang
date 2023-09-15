import type { ModelExposedIdentityIndex } from '../../../langium-model-server/identity'
import { AbstractIdentityManager } from '../../../langium-model-server/identity/manager'
import type * as source from '../lms/model'
import type { TaskListDocument } from '../workspace/documents'
import { IdentityModel } from './storage'
import { TaskListIdentityIndex } from '.'

/**
 * Stores {@link IdentityModel} per URI of Langium-managed TextDocument.
 * It has control over all {@link TaskListIdentityIndex}es existing.
 */
export class TaskListIdentityManager extends AbstractIdentityManager<source.Model, TaskListIdentityIndex, TaskListDocument> {

    protected override loadIdentityToIndex(languageDocumentUri: string): ModelExposedIdentityIndex<TaskListIdentityIndex> {
        const identityModel = this.identityStorage.loadIdentityFromFile(languageDocumentUri, IdentityModel.is)
        return new AccessibleTaskListIdentityIndex(identityModel)
    }

}

/**
 * Hidden class with the only purpose to reveal {@link IdentityModel}
 * wrapped with {@link TaskListIdentityIndex} to persist it to the file
 * by {@link SemanticModelStorage}.
 *
 * Since {@link SemanticIndexManager} is the only one who persists
 * and removes {@link TaskListIdentityIndex} from its registry, it is
 * also the only one who is aware of a particular
 * {@link TaskListIdentityIndex} implementation
 */
class AccessibleTaskListIdentityIndex extends TaskListIdentityIndex {

    public override get model(): IdentityModel {
        return super.model
    }
}
