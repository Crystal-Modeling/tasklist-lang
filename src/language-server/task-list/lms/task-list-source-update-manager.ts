import { AbstractSourceUpdateManager } from '../../../langium-model-server/lms/source-update-manager'
import type { TaskListDocument } from '../workspace/documents'
import type { Model } from './model'
import { TaskListSourceModelUpdateCalculator } from './task-list-source-update-calculation'

export class TaskListSourceUpdateManager extends AbstractSourceUpdateManager<Model> {

    public override getUpdateCalculator(langiumDocument: TaskListDocument): TaskListSourceModelUpdateCalculator {
        return super.getUpdateCalculator(langiumDocument) as TaskListSourceModelUpdateCalculator
    }

    protected override createCalculator(langiumDocument: TaskListDocument): TaskListSourceModelUpdateCalculator {
        if (!langiumDocument.semanticDomain) {
            //FIXME: Quick and dirty solution. Introduce stable API here
            throw new Error('Creating Calculator before Semantic Domain got initialized!')
        }
        return new TaskListSourceModelUpdateCalculator(langiumDocument.semanticDomain)
    }

}
