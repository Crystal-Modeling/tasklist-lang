import { AbstractModelUpdateManager } from '../../../langium-model-server/lms/model-update-manager'
import type { TaskListDocument } from '../workspace/documents'
import type { Model } from './model'
import { TaskListModelUpdateCalculator } from './task-list-source-update-calculation'

export class TaskListModelUpdateManager extends AbstractModelUpdateManager<Model> {

    public override getUpdateCalculator(langiumDocument: TaskListDocument): TaskListModelUpdateCalculator {
        return super.getUpdateCalculator(langiumDocument) as TaskListModelUpdateCalculator
    }

    protected override createCalculator(langiumDocument: TaskListDocument): TaskListModelUpdateCalculator {
        if (!langiumDocument.semanticDomain) {
            //FIXME: Quick and dirty solution. Introduce stable API here
            throw new Error('Creating Calculator before Semantic Domain got initialized!')
        }
        return new TaskListModelUpdateCalculator(langiumDocument.semanticDomain)
    }

}
