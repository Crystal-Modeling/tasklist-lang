import type { MaybePromise } from 'langium'
import type { Position } from 'vscode-languageserver'
import { ApplyWorkspaceEditRequest, TextEdit } from 'vscode-languageserver'
import { AbstractLangiumModelServerFacade } from '../../../langium-model-server/lms/facade'
import type { Creation } from '../../../langium-model-server/lms/model'
import { CreationResponse } from '../../../langium-model-server/lms/model'
import type { LangiumModelServerServices } from '../../../langium-model-server/services'
import type { LmsDocument } from '../../../langium-model-server/workspace/documents'
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
        this.addModelHandlersByUriSegment.set('/transitions', {
            isApplicable: Transition.isNew,
            addModel: this.addTransition.bind(this)
        })
    }

    public addTask(rootModelId: string, newTask: Creation<Task>, anchorTaskId?: string): MaybePromise<CreationResponse> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }

        let position: Position | undefined
        if (anchorTaskId) {
            const anchorModel = lmsDocument.semanticDomain.identifiedTasks.get(anchorTaskId)
            if (anchorModel && anchorModel?.$cstNode) {
                position = { line: anchorModel.$cstNode.range.end.line + 1, character: 0 }
            }
        }
        if (!position) {
            position = { line: lmsDocument.textDocument.lineCount - 1, character: 0 }
        }

        const serializedModel = `task ${newTask.name} "${newTask.content}"\n`
        const textEdit = TextEdit.insert(position, serializedModel)

        return this.connection.sendRequest(ApplyWorkspaceEditRequest.type,
            { label: 'Create new task ' + newTask.name, edit: { changes: { [lmsDocument.textDocument.uri]: [textEdit] } } })
            .then(editResult => editResult.applied
                ? CreationResponse.created()
                : CreationResponse.failedTextEdit(editResult.failureReason)
            )
    }

    public addTransition(rootModelId: string, newModel: Creation<Transition>): MaybePromise<CreationResponse> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }

        const sourceTask = lmsDocument.semanticDomain.identifiedTasks.get(newModel.sourceTaskId)
        // HACK: You can only add transition for the target node, which is present in the *same* document
        const targetTask = lmsDocument.semanticDomain.identifiedTasks.get(newModel.targetTaskId)
        const unresolvedTasks: string[] = []
        if (!sourceTask)
            unresolvedTasks.push('source Task by id ' + newModel.sourceTaskId)
        if (!targetTask)
            unresolvedTasks.push('target Task by id ' + newModel.targetTaskId)
        if (!sourceTask || !targetTask) {
            return CreationResponse.failedValidation('Unable to resolve: ' + unresolvedTasks.join(', '))
        }

        const anchorPosition = sourceTask.$cstNode?.range?.end
        if (!anchorPosition) {
            throw new Error('Cannot locate source task ' + sourceTask.name + '(' + sourceTask.id + ') in text')
        }

        const prefix = (!sourceTask.references || sourceTask.references.length === 0)
            ? ' -> '
            : ', '
        const serializedModel = prefix + targetTask.name

        const textEdit = TextEdit.insert(anchorPosition, serializedModel)

        return this.connection.sendRequest(ApplyWorkspaceEditRequest.type,
            {
                label: 'Create new transition: ' + sourceTask.name + '->' + targetTask.name,
                edit: { changes: { [lmsDocument.textDocument.uri]: [textEdit] } }
            }
        ).then(editResult => editResult.applied
            ? CreationResponse.created()
            : CreationResponse.failedTextEdit(editResult.failureReason)
        )
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
