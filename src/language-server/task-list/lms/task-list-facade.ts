import type { AstNodeLocator, References } from 'langium'
import { findNodeForProperty, getContainerOfType, getPreviousNode, type MaybePromise } from 'langium'
import type { Position, WorkspaceEdit } from 'vscode-languageserver'
import { ApplyWorkspaceEditRequest, TextEdit } from 'vscode-languageserver'
import { AbstractLangiumModelServerFacade } from '../../../langium-model-server/lms/facade'
import type { Creation, CreationParams, Modification } from '../../../langium-model-server/lms/model'
import * as lms from '../../../langium-model-server/lms/model'
import { EditingResult } from '../../../langium-model-server/lms/model'
import type { LmsSubscriptions } from '../../../langium-model-server/lms/subscriptions'
import type { AstNodeSemanticIdentity, Renameable } from '../../../langium-model-server/identity/model'
import * as id from '../../../langium-model-server/semantic/model'
import type { LangiumModelServerServices } from '../../../langium-model-server/services'
import type { LmsDocument } from '../../../langium-model-server/workspace/documents'
import * as ast from '../../generated/ast'
import * as identity from '../identity/model'
import * as semantic from '../semantic/model'
import type { TaskListIdentityIndex } from '../identity'
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

        this.addModelHandlersByPathSegment.set('tasks', {
            isApplicable: Task.isNew,
            addModel: this.addTask.bind(this)
        })
        this.addModelHandlersByPathSegment.set('transitions', {
            isApplicable: Transition.isNew,
            addModel: this.addTransition.bind(this)
        })
        this.updateModelHandlersByPathSegment.set('tasks', this.updateTask.bind(this))
        this.updateModelHandlersByPathSegment.set('transitions', this.updateTransition.bind(this))
        this.deleteModelHandlersByPathSegment.set('tasks', this.deleteTask.bind(this))
        this.deleteModelHandlersByPathSegment.set('transitions', this.deleteTransition.bind(this))
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

    public updateTask(rootModelId: string, modelId: string, taskModification: Modification<Task>): MaybePromise<EditingResult> | undefined {

        console.debug('Updating task for rootModelId', rootModelId, 'modelId', modelId)
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const task = lmsDocument.semanticDomain.identifiedTasks.get(modelId)
        if (!task) {
            return EditingResult.failedValidation('Unable to resolve task by id ' + modelId)
        }

        let renameableTaskIdentity: Renameable<AstNodeSemanticIdentity> | undefined

        const textEdit = this.computeTaskUpdate(task, taskModification)

        if (textEdit) {
            if (taskModification.name) {
                renameableTaskIdentity = this.identityManager.getIdentityIndex(lmsDocument).findAstNodeIdentityById(task.id)
                renameableTaskIdentity?.updateName(taskModification.name)
            }
            return this.applyTextEdit(lmsDocument, textEdit, 'Updated task ' + task.name
            ).then(editingResult => {
                if (editingResult.successful) {
                    console.debug('Modified Task attributes:', taskModification)
                    if (renameableTaskIdentity) {
                        const update = lms.RootUpdate.createEmpty<Task>(renameableTaskIdentity.id, renameableTaskIdentity.modelUri)
                        lms.Update.assignIfUpdated(update, 'name', task.name, taskModification.name ?? task.name)
                        this.lmsSubscriptions.getSubscription(rootModelId)?.pushUpdate(update)
                    }
                } else {
                    // Reverting modified identity on failure
                    renameableTaskIdentity?.updateName(task.name)
                }
                return editingResult
            }, failure => {
                renameableTaskIdentity?.updateName(task.name)
                return failure
            })
        } else {
            return EditingResult.unmodified()
        }
    }

    public updateTransition(rootModelId: string, modelId: string, transitionModification: Modification<Transition>): MaybePromise<EditingResult> | undefined {

        console.debug('Updating transition for rootModelId', rootModelId, 'modelId', modelId)
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const transition = lmsDocument.semanticDomain.identifiedTransitions.get(modelId)
        if (!transition) {
            return EditingResult.failedValidation('Unable to resolve transition by id ' + modelId)
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
            .findTransitionIdentityById(transition.id)

        const changes = this.computeTransitionUpdate(transition, newTransition)

        if (changes.length > 0) {
            renameableTransitionIdentity?.updateName(newTransition.name)
            return this.applyWorkspaceEdit({ changes: { [lmsDocument.textDocument.uri]: changes } },
                'Updated transition: ' + transition.name + 'to ' + newTransition.name
            ).then(editingResult => {
                if (editingResult.successful) {
                    console.debug('Modified Transition attributes. New transition', newTransition)
                    if (renameableTransitionIdentity) {
                        const update = lms.RootUpdate.createEmpty<Transition>(renameableTransitionIdentity.id, renameableTransitionIdentity.modelUri)
                        lms.Update.assignIfUpdated(update, 'sourceTaskId', transition.sourceTask.id, newTransition.sourceTask.id)
                        lms.Update.assignIfUpdated(update, 'targetTaskId', transition.targetTask.id, newTransition.targetTask.id)
                        this.lmsSubscriptions.getSubscription(rootModelId)?.pushUpdate(update)
                    }
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

    private computeTaskCreation(lmsDocument: TaskListDocument, newTask: Creation<Task>, anchorModel?: id.Identified<ast.Task>): TextEdit {

        let prefix = ''
        let suffix = ''
        const parsedTasks = lmsDocument.parseResult.value.tasks
        let position: Position = { line: 0, character: 0 }
        if (parsedTasks.length > 0) {
            console.debug('Found', parsedTasks.length, 'parsed tasks')
            const lastTask = parsedTasks[parsedTasks.length - 1]
            if (!lastTask.$cstNode) {
                throw new Error('Cannot locate LAST task ' + lastTask.name + ' in text')
            }
            position = lastTask.$cstNode.range.end
            console.debug('Located end position of the last task:', position)
            prefix = '\n'
        }

        if (anchorModel?.$cstNode) {
            position = anchorModel.$cstNode.range.start
            console.debug('Located start position of anchor task:', position)
            prefix = ''
            suffix = '\n'
        }

        const serializedTask = `task ${newTask.name} "${newTask.content}"`

        return TextEdit.insert(position, prefix + serializedTask + suffix)
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
        if (taskModification.content || taskModification.name) {
            const serializedTask = `task ${taskModification.name ?? task.name} "${taskModification.content ?? task.content}"`
            const start = task.$cstNode.range.start
            const end = findNodeForProperty(task.$cstNode, 'content')?.range.end ?? task.$cstNode.range.end

            return TextEdit.replace({ start, end }, serializedTask)
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

        const start = getPreviousNode(task.$cstNode, false)?.range?.end ?? { line: 0, character: 0 }
        const end = task.$cstNode.range.end
        const deleteTaskEdit = TextEdit.del({ start, end })
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
