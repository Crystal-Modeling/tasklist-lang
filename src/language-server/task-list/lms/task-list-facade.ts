import type { AstNodeLocator, References } from 'langium'
import { findNodeForProperty, getContainerOfType, type MaybePromise } from 'langium'
import type { Position, WorkspaceEdit } from 'vscode-languageserver'
import { ApplyWorkspaceEditRequest, TextEdit } from 'vscode-languageserver'
import { AbstractLangiumModelServerFacade } from '../../../langium-model-server/lms/facade'
import type { Creation, CreationParams, Modification } from '../../../langium-model-server/lms/model'
import * as lms from '../../../langium-model-server/lms/model'
import { EditingResult } from '../../../langium-model-server/lms/model'
import type { LmsSubscriptions } from '../../../langium-model-server/lms/subscriptions'
import * as id from '../../../langium-model-server/semantic/model'
import type { LangiumModelServerServices } from '../../../langium-model-server/services'
import type { LmsDocument } from '../../../langium-model-server/workspace/documents'
import * as ast from '../../generated/ast'
import * as identity from '../../task-list/semantic/task-list-identity'
import * as semantic from '../semantic/model'
import type { TaskListIdentityIndex } from '../semantic/task-list-identity-index'
import type { TaskListDocument } from '../workspace/documents'
import { isTaskListDocument } from '../workspace/documents'
import { Model, Task, Transition } from './model'

export class TaskListLangiumModelServerFacade extends AbstractLangiumModelServerFacade<Model, TaskListIdentityIndex, TaskListDocument> {

    private readonly references: References
    private readonly astNodeLocator: AstNodeLocator
    private readonly lmsSubscriptions: LmsSubscriptions

    constructor(services: LangiumModelServerServices<Model, TaskListIdentityIndex, TaskListDocument>) {
        super(services)
        this.references = services.references.References
        this.astNodeLocator = services.workspace.AstNodeLocator
        this.lmsSubscriptions = services.lms.LmsSubscriptions

        this.addModelHandlersByUriSegment.set('/tasks', {
            isApplicable: Task.isNew,
            addModel: this.addTask.bind(this)
        })
        this.addModelHandlersByUriSegment.set('/transitions', {
            isApplicable: Transition.isNew,
            addModel: this.addTransition.bind(this)
        })
        this.updateModelHandlersByUriSegment.set('/tasks', this.updateTask.bind(this))
        this.deleteModelHandlersByUriSegment.set('/tasks', this.deleteTask.bind(this))
        this.deleteModelHandlersByUriSegment.set('/transitions', this.deleteTransition.bind(this))
    }

    public addTask(rootModelId: string, newTask: Creation<Task>, creationParams: CreationParams): MaybePromise<EditingResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        let anchorModel: id.Identified<ast.Task> | undefined
        if (creationParams.anchorModelId) {
            anchorModel = lmsDocument.semanticDomain.identifiedTasks.get(creationParams.anchorModelId)
        }

        const textEdit = this.computeTaskCreation(lmsDocument, newTask, anchorModel)

        return this.applyTextEdit(lmsDocument, textEdit, 'Create new task ' + newTask.name)
    }

    public addTransition(rootModelId: string, newModel: Creation<Transition>, creationParams: CreationParams = {}): MaybePromise<EditingResult> | undefined {

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
            return EditingResult.failedValidation('Unable to resolve: ' + unresolvedTasks.join(', '))
        }

        let anchorModel: id.Identified<semantic.Transition> | undefined
        if (creationParams.anchorModelId) {
            anchorModel = lmsDocument.semanticDomain.identifiedTransitions.get(creationParams.anchorModelId)
            if (anchorModel && anchorModel.sourceTask.id !== sourceTask.id) {
                return EditingResult.failedValidation('Anchor model for Transition must be another Transition within the same sourceTask')
            }
        }
        const newTransition = semantic.Transition.createNew(sourceTask, targetTask)
        const textEdit = this.computeTransitionCreation(newTransition, anchorModel)

        return this.applyTextEdit(lmsDocument, textEdit, 'Created new transition: ' + newTransition.name)
    }

    public updateTask(rootModelId: string, taskModification: Modification<Task>): MaybePromise<EditingResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const task = lmsDocument.semanticDomain.identifiedTasks.get(taskModification.id)
        if (!task) {
            return EditingResult.failedValidation('Unable to resolve task by id ' + taskModification.id)
        }

        const textEdit = this.computeTaskUpdate(task, taskModification)
        if (textEdit) {
            return this.applyTextEdit(lmsDocument, textEdit, 'Updated task ' + task.name)
        } else {
            return EditingResult.unmodified()
        }
    }

    public updateTransition(rootModelId: string, transitionModification: Modification<Transition>): MaybePromise<EditingResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const transition = lmsDocument.semanticDomain.identifiedTransitions.get(transitionModification.id)
        if (!transition) {
            return EditingResult.failedValidation('Unable to resolve transition by id ' + transitionModification.id)
        }
        let newSourceTask: id.Identified<ast.Task> | undefined
        let newTargetTask: id.Identified<ast.Task> | undefined

        // You can only update transition for the source and target node, that are present in the *same* document
        if (transitionModification.sourceTaskId)
            newSourceTask = lmsDocument.semanticDomain.identifiedTasks.get(transitionModification.sourceTaskId)
        if (transitionModification.targetTaskId)
            newTargetTask = lmsDocument.semanticDomain.identifiedTasks.get(transitionModification.targetTaskId)
        const unresolvedTasks: string[] = []
        if (transitionModification.sourceTaskId && !newSourceTask)
            unresolvedTasks.push('new source Task by id ' + transitionModification.sourceTaskId)
        if (transitionModification.targetTaskId && !newTargetTask)
            unresolvedTasks.push('new target Task by id ' + transitionModification.targetTaskId)
        if (unresolvedTasks.length > 0) {
            return EditingResult.failedValidation('Unable to resolve: ' + unresolvedTasks.join(', '))
        }

        const newTransition = semantic.Transition.createNew(newSourceTask ?? transition.sourceTask, newTargetTask ?? transition.targetTask)

        const renameableTransitionIdentity = this.identityManager.getIdentityIndex(lmsDocument)
            .findDerivedElementById(transition.id, identity.Transition.nameBuilder)

        const changes = this.computeTransitionUpdate(transition, newTransition)

        if (changes.length > 0) {
            renameableTransitionIdentity?.updateName(newTransition.name)
            return this.applyWorkspaceEdit({ changes: { [lmsDocument.textDocument.uri]: changes } },
                'Updated transition: ' + transition.name + 'to ' + newTransition.name
            ).then(editingResult => {
                if (editingResult.successful) {
                    console.debug('Modified Transition attributes. New transition', newTransition)
                    const update = lms.Update.createEmpty<Transition>(transition.id)
                    lms.Update.assignArtificialIfUpdated(update, 'sourceTaskId', transition.sourceTask.id, newTransition.sourceTask.id)
                    lms.Update.assignArtificialIfUpdated(update, 'targetTaskId', transition.targetTask.id, newTransition.targetTask.id)
                    this.lmsSubscriptions.getSubscription(rootModelId)?.pushUpdate(update)
                } else {
                    // Reverting modified identity on failure
                    renameableTransitionIdentity?.updateName(transition.name)
                }
                return editingResult
            }, failure => {
                renameableTransitionIdentity?.updateName(transition.name)
                return failure
            })
        } else {
            return EditingResult.unmodified()
        }
    }

    public deleteTask(rootModelId: string, taskId: string): MaybePromise<EditingResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const task = lmsDocument.semanticDomain.identifiedTasks.get(taskId)
        if (!task) {
            return EditingResult.failedValidation('Unable to resolve model by id ' + taskId)
        }

        const workspaceEdit = this.computeTaskDeletion(lmsDocument, task)

        return this.applyWorkspaceEdit(workspaceEdit, 'Deleted task ' + task.name)
    }

    public deleteTransition(rootModelId: string, transitionId: string): MaybePromise<EditingResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const transition = lmsDocument.semanticDomain.identifiedTransitions.get(transitionId)
        if (!transition) {
            return undefined
        }

        const textEdit = this.computeTransitionDeletion(transition)

        return this.applyTextEdit(lmsDocument, textEdit, 'Deleted transition ' + transition.name)
    }

    private computeTaskCreation(lmsDocument: LmsDocument, newTask: Creation<Task>, anchorModel?: id.Identified<ast.Task>): TextEdit {

        let prefix = '\n'
        let suffix = ''
        let position: Position = { line: lmsDocument.textDocument.lineCount - 1, character: 0 }
        if (anchorModel?.$cstNode) {
            position = anchorModel.$cstNode.range.start
            prefix = ''
            suffix = '\n'
        }

        const serializedModel = prefix + `task ${newTask.name} "${newTask.content}"` + suffix

        return TextEdit.insert(position, serializedModel)
    }

    private computeTransitionCreation({ sourceTask, targetTask }: semantic.NewTransition,
        anchorModel?: id.Identified<semantic.Transition>): TextEdit {

        if (!sourceTask.$cstNode) {
            throw new Error('Cannot locate source task ' + sourceTask.name + '(' + sourceTask.id + ') in text')
        }

        let prefix = (!sourceTask.references || sourceTask.references.length === 0)
            ? ' -> '
            : ', '
        let suffix = ''
        let position: Position = sourceTask.$cstNode.range.end

        if (anchorModel?.$cstNode) {
            position = anchorModel.$cstNode.range.start
            prefix = ''
            suffix = ', '
        }

        const serializedModel = prefix + targetTask.name + suffix

        return TextEdit.insert(position, serializedModel)
    }

    private computeTaskUpdate(task: id.Identified<ast.Task>, taskModification: Modification<Task>): TextEdit | undefined {

        console.debug('Computing Update edit for Task with name', task.name)
        if (!task.$cstNode) {
            throw new Error('Cannot locate task ' + task.name + '(' + task.id + ') in text')
        }
        if (taskModification.content && taskModification.content !== task.content) {
            const serializedTaskContent = `"${taskModification.content}"`
            const contentNode = findNodeForProperty(task.$cstNode, 'content')

            return contentNode
                ? TextEdit.replace(contentNode.range, serializedTaskContent)
                : TextEdit.insert(task.$cstNode.range.end, ' ' + serializedTaskContent)
        }
        return undefined
    }

    private computeTransitionUpdate(transition: id.Identified<semantic.Transition>, newTransition: semantic.NewTransition): TextEdit[] {
        if (!transition.$cstNode) {
            throw new Error('Cannot locate model ' + transition.name + '(' + transition.id + ') in text')
        }
        const changes: TextEdit[] = []
        if (newTransition.sourceTask !== transition.sourceTask) {
            changes.push(this.computeTransitionDeletion(transition))
            changes.push(this.computeTransitionCreation(newTransition))
        } else if (newTransition.targetTask !== transition.targetTask) {
            const serializedModel = newTransition.targetTask.name
            changes.push(TextEdit.replace(transition.$cstNode.range, serializedModel))
        }
        return changes
    }

    private computeTaskDeletion(lmsDocument: LmsDocument, task: id.Identified<ast.Task>): WorkspaceEdit {

        console.debug('Computing Deletion edit for Task with name', task.name)
        if (!task.$cstNode) {
            throw new Error('Cannot locate model ' + task.name + '(' + task.id + ') in text')
        }

        const deleteTaskEdit = TextEdit.del(task.$cstNode.range)
        const changes: { [uri: string]: TextEdit[] } = { [lmsDocument.textDocument.uri]: [deleteTaskEdit] }
        this.references.findReferences(task, { includeDeclaration: false })
            .map((ref): [documentUri: string, transition: id.Identified<semantic.Transition>] | undefined => {
                const doc = this.langiumDocuments.getOrCreateDocument(ref.sourceUri) as LmsDocument
                const sourceTask = getContainerOfType(this.astNodeLocator.getAstNode(doc.parseResult.value, ref.sourcePath), ast.isTask)
                if (!this.isLmsDocument(doc) || !id.Identified.is(sourceTask)) {
                    console.debug('Source document or source task are not LMS-compatible', doc, sourceTask)
                    return undefined
                }
                const transitionName = identity.TransitionDerivativeName.of(sourceTask.id, task.id)
                const transitionId = this.identityManager.getIdentityIndex(doc).transitionsByName.get(transitionName)?.id
                if (!transitionId) {
                    console.debug('Cannot find transition identity with name', transitionName)
                    return undefined
                }
                console.debug('Found transition identity with name', transitionName)
                const transition = doc.semanticDomain?.identifiedTransitions.get(transitionId)
                if (!transition) {
                    console.debug('Transition is not found in semantic domain')
                    return undefined
                }
                return [doc.textDocument.uri, transition]
            }).nonNullable()
            .forEach(([documentUri, transition]) => {
                const transitionDeletionEdit = this.computeTransitionDeletion(transition)
                changes[documentUri]
                    ? changes[documentUri].push(transitionDeletionEdit)
                    : changes[documentUri] = [transitionDeletionEdit]
            })

        return { changes }
    }

    // TODO: Extract to separate component (that will be responsible for TextEdit computation)
    private computeTransitionDeletion(transition: id.Identified<semantic.Transition>): TextEdit {

        console.debug('Computing Deletion edit for Transition with name', transition.name)
        const task = transition.sourceTask
        if (!transition.$cstNode || !task.$cstNode) {
            throw new Error('Cannot locate model ' + transition.name + '(' + transition.id + ') in text')
        }

        let start: Position
        let end: Position
        if (task.references.length > 1) {
            if (transition.$containerIndex === 0) {
                const nextNode = task.references[1].$refNode!
                start = transition.$cstNode.range.start
                end = nextNode.range.start
            } else {
                const previousNode = task.references[transition.$containerIndex - 1].$refNode!
                start = previousNode.range.end
                end = transition.$cstNode.range.end
            }
        } else {
            const previousNode = findNodeForProperty(task.$cstNode, 'content') ?? task.$cstNode
            start = previousNode.range.end
            end = transition.$cstNode.range.end
        }

        return TextEdit.del({ start, end })
    }

    private applyTextEdit(lmsDocument: LmsDocument, textEdit: TextEdit, label?: string): Promise<EditingResult> {
        return this.applyWorkspaceEdit({ changes: { [lmsDocument.textDocument.uri]: [textEdit] } }, label)
    }

    private applyWorkspaceEdit(workspaceEdit: WorkspaceEdit, label?: string): Promise<EditingResult> {
        return this.connection.sendRequest(ApplyWorkspaceEditRequest.type,
            { label, edit: workspaceEdit }
        ).then(editResult => editResult.applied
            ? EditingResult.successful()
            : EditingResult.failedTextEdit(editResult.failureReason)
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
