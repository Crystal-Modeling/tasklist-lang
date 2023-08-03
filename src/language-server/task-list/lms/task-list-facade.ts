import { ApplyWorkspaceEditRequest, TextEdit } from 'vscode-languageserver'
import { AbstractLangiumModelServerFacade } from '../../../langium-model-server/lms/facade'
import { NewModel } from '../../../langium-model-server/lms/model'
import type { LangiumModelServerServices } from '../../../langium-model-server/services'
import type { LmsDocument } from '../../../langium-model-server/workspace/documents'
import * as identity from '../semantic/task-list-identity'
import type { TaskListIdentityIndex } from '../semantic/task-list-identity-index'
import type { TaskListDocument } from '../workspace/documents'
import { isTaskListDocument } from '../workspace/documents'
import { Model, Task, Transition } from './model'

export class TaskListLangiumModelServerFacade extends AbstractLangiumModelServerFacade<Model, TaskListIdentityIndex, TaskListDocument> {

    constructor(services: LangiumModelServerServices<Model, TaskListIdentityIndex, TaskListDocument>) {
        super(services)
        this.addModelHandlersByUriSegment.set('/tasks', {
            isApplicable: Task.isNew,
            addModel: this.addTask.bind(this)
        })
    }

    public addTask(rootModelId: string, anchorTaskId: string, newTask: NewModel<Task>): Task | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }

        const identityIndex = this.semanticIndexManager.getIdentityIndex(lmsDocument)
        const taskIdentity = identity.Model.newTask(newTask.name)
        identityIndex.addTask(taskIdentity)

        const anchorPosition = lmsDocument.semanticDomain.identifiedTasks.get(anchorTaskId)?.$cstNode?.range?.end
        const serializedModel = Task.serialize(newTask)

        const textEdit = anchorPosition ? TextEdit.insert(anchorPosition, '\n' + serializedModel)
            : TextEdit.insert({ line: lmsDocument.textDocument.lineCount, character: 0 }, serializedModel)
        this.connection.sendRequest(ApplyWorkspaceEditRequest.type,
            { label: 'Create new task ' + newTask.name, edit: { changes: { [lmsDocument.textDocument.uri]: [textEdit] } } })

        return NewModel.assignId(newTask, taskIdentity.id)
    }

    protected override convertSemanticModelToSourceModel(lmsDocument: LmsDocument): Model | undefined {

        if (!isTaskListDocument(lmsDocument) || !lmsDocument.semanticDomain?.identifiedRootNode) {
            return undefined
        }
        const sourceModel = Model.create(lmsDocument.semanticDomain.identifiedRootNode)
        for (const task of lmsDocument.semanticDomain.identifiedTasks.values()) {
            sourceModel.tasks.push(Task.create(task))
        }

        for (const transition of lmsDocument.semanticDomain.identifiedTransitions.values()) {
            sourceModel.transitions.push(Transition.create(transition))
        }
        return sourceModel
    }
}
