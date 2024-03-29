import type { AstNodeLocator, References } from 'langium'
import { findNodeForProperty, getContainerOfType, getDocument, stream, type MaybePromise, getNextNode } from 'langium'
import type { Position} from 'vscode-languageserver'
import { ApplyWorkspaceEditRequest, TextEdit } from 'vscode-languageserver'
import * as id from '../../../langium-model-server/identity/model'
import { AbstractLangiumModelServerFacade } from '../../../langium-model-server/lms/facade'
import type { Creation, CreationParams, Modification } from '../../../langium-model-server/lms/model'
import { ModificationResult } from '../../../langium-model-server/lms/model'
import type { TextEditService } from '../../../langium-model-server/lms/text-edit-service'
import { SourceEdit } from '../../../langium-model-server/lms/text-edit-service'
import * as sem from '../../../langium-model-server/semantic/model'
import type { LangiumModelServerServices } from '../../../langium-model-server/services'
import { LmsDocument } from '../../../langium-model-server/workspace/documents'
import * as ast from '../../generated/ast'
import type { TaskListIdentityIndex } from '../identity/indexed'
import * as identity from '../identity/model'
import * as semantic from '../semantic/model'
import type { TaskListSemanticDomain } from '../semantic/task-list-semantic-domain'
import type { TaskListDocument } from '../workspace/documents'
import { isTaskListDocument } from '../workspace/documents'
import { Model, Task, Transition } from './model'

export class TaskListLangiumModelServerFacade extends AbstractLangiumModelServerFacade<Model, TaskListIdentityIndex, TaskListDocument> {

    private readonly references: References
    private readonly astNodeLocator: AstNodeLocator
    private readonly textEditService: TextEditService

    constructor(services: LangiumModelServerServices<Model, TaskListIdentityIndex, TaskListDocument>) {
        super(services)
        this.references = services.references.References
        this.astNodeLocator = services.workspace.AstNodeLocator
        this.textEditService = services.lms.TextEditService

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

    public addTask(rootModelId: string, newTask: Creation<Task>, creationParams: CreationParams): MaybePromise<ModificationResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const validatedName = this.identityManager.getIdentityIndex(lmsDocument).tasks.fitName(newTask.name)
        if (!validatedName) {
            return ModificationResult.failedValidation(`Unable to fit supplied task name '${newTask.name}': invalid value`)
        }
        newTask.name = validatedName.result
        const rollback = validatedName.rollback
        let anchorModel: semantic.IdentifiedTask | undefined
        if (creationParams.anchorModelId) {
            anchorModel = lmsDocument.semanticDomain.identifiedTasks.get(creationParams.anchorModelId)
        }

        const textEdit = this.computeTaskCreation(lmsDocument, newTask, anchorModel)

        return this.applyTextEdit(lmsDocument, textEdit, 'Create new task ' + newTask.name, rollback)
    }

    public addTransition(rootModelId: string, newModel: Creation<Transition>, creationParams: CreationParams = {}): MaybePromise<ModificationResult> | undefined {

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
            return ModificationResult.failedValidation('Unable to resolve: ' + unresolvedTasks.join(', '))
        }

        const newTransitionProps = semantic.Transition.properties(sourceTask, targetTask)
        const newTransitionName = identity.TransitionName.from(newTransitionProps)
        if (!this.identityManager.getIdentityIndex(lmsDocument).transitions.isNameFit(newTransitionName)) {
            return ModificationResult.failedValidation(`Unable to fit supplied transition name ${newTransitionName}: invalid value`)
        }

        let anchorModel: semantic.IdentifiedTransition | undefined
        if (creationParams.anchorModelId) {
            anchorModel = lmsDocument.semanticDomain.identifiedTransitions.get(creationParams.anchorModelId)
            if (anchorModel && anchorModel.$props.sourceTask !== sourceTask) {
                return ModificationResult.failedValidation('Anchor model for Transition must be another Transition within the same sourceTask')
            }
        }
        const textEdit = this.computeTransitionCreation(newTransitionProps, anchorModel)

        return this.applyTextEdit(lmsDocument, textEdit, 'Created new transition: ' + newTransitionName)
    }

    public updateTask(rootModelId: string, modelId: string, taskModification: Modification<Task>): MaybePromise<ModificationResult> | undefined {

        console.debug('Updating task for rootModelId', rootModelId, 'modelId', modelId)
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const task = lmsDocument.semanticDomain.identifiedTasks.get(modelId)
        if (!task) {
            return ModificationResult.failedValidation('Unable to resolve task by id ' + modelId)
        }
        let rollback: id.StateRollback | undefined
        if (taskModification.name) {
            const validatedName = task.$identity.fitNewName(taskModification.name)
            if (!validatedName) {
                return ModificationResult.failedValidation(`Unable to fit supplied task name '${taskModification.name}': invalid value`)
            }
            taskModification.name = validatedName.result
            rollback = validatedName.rollback
        }

        const edit = this.computeTaskUpdate(task, taskModification)
        if (!edit) {
            return ModificationResult.unmodified()
        }

        if (taskModification.name) {
            const renameRollback = task.$identity.updateName(taskModification.name)
            if (!renameRollback) {
                return ModificationResult.failedValidation(`Unable to rename task to '${taskModification.name}'`)
            }
            rollback = id.StateRollback.add(rollback, renameRollback)
        }
        return this.applySourceEdit(edit, 'Updated task ' + task.name, rollback)

    }

    public updateTransition(rootModelId: string, modelId: string, transitionModification: Modification<Transition>): MaybePromise<ModificationResult> | undefined {

        console.debug('Updating transition for rootModelId', rootModelId, 'modelId', modelId)
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const transition = lmsDocument.semanticDomain.identifiedTransitions.get(modelId)
        if (!transition) {
            return ModificationResult.failedValidation('Unable to resolve transition by id ' + modelId)
        }
        let newSourceTask: semantic.IdentifiedTask | undefined
        let newTargetTask: semantic.IdentifiedTask | undefined

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
            return ModificationResult.failedValidation('Unable to resolve: ' + unresolvedTasks.join(', '))
        }

        const newTransitionProps = semantic.Transition.properties(newSourceTask ?? transition.$props.sourceTask, newTargetTask ?? transition.$props.targetTask)
        const newTransitionName = identity.TransitionName.from(newTransitionProps)
        if (!transition.$identity.isNewNameFit(newTransitionName)) {
            return ModificationResult.failedValidation(`Unable to fit supplied transition name ${newTransitionName}: invalid value`)
        }

        const sourceEdit = this.computeTransitionUpdate(lmsDocument, transition, newTransitionProps)

        if (sourceEdit.size > 0) {
            const rollback = transition.$identity.updateName(newTransitionName)
            if (!rollback) {
                return ModificationResult.failedValidation(`Unable to rename transition to '${newTransitionName}'`)
            }
            return this.applySourceEdit(sourceEdit, 'Updated transition: ' + transition.$identity.name + 'to ' + newTransitionName, rollback)
        } else {
            return ModificationResult.unmodified()
        }
    }

    public override deleteModels(rootModelId: string, modelIds: string[]): MaybePromise<ModificationResult> | undefined {
        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const unresolvedModelIds: string[] = []
        const resolvedTasks = new Map<string, semantic.IdentifiedTask>()
        const resolvedTransitions = new Map<string, semantic.IdentifiedTransition>()

        stream(modelIds)
            .distinct()
            .forEach(modelId => {
                let resolvedModel
                if ((resolvedModel = lmsDocument.semanticDomain.identifiedTasks.get(modelId))) {
                    resolvedTasks.set(modelId, resolvedModel)
                } else if ((resolvedModel = lmsDocument.semanticDomain.identifiedTransitions.get(modelId))) {
                    resolvedTransitions.set(modelId, resolvedModel)
                } else {
                    unresolvedModelIds.push(modelId)
                }
            })

        const taskIds = new Set(resolvedTasks.keys())
        const sourceEditAndLabel = stream(resolvedTasks.values())
            .map(task => this.computeTaskDeletion(lmsDocument, task, taskIds))
            .concat(stream(resolvedTransitions.values())
                .filter((transition) => !resolvedTasks.has(transition.$props.sourceTask.$identity.id) && !resolvedTasks.has(transition.$props.targetTask.$identity.id))
                .map(transition => this.computeTransitionDeletion(lmsDocument, transition))
            ).reduce((sourceEditAndLabel, [nextSourceEdit, nextLabel]) => {
                sourceEditAndLabel[0].apply(nextSourceEdit)
                sourceEditAndLabel[1] = `${sourceEditAndLabel[1]};${nextLabel}`
                return sourceEditAndLabel
            })
        if (!sourceEditAndLabel) {
            return unresolvedModelIds.length > 0
                ? ModificationResult.failedValidation('Unable to resolve models for ids ' + unresolvedModelIds)
                : ModificationResult.unmodified()
        }

        return this.applySourceEdit(...sourceEditAndLabel)
    }

    public deleteTask(rootModelId: string, taskId: string): MaybePromise<ModificationResult> | undefined {
        return this.deleteModel(rootModelId, taskId, (domain, id) => domain.identifiedTasks.get(id), this.computeTaskDeletion.bind(this))
    }

    public deleteTransition(rootModelId: string, transitionId: string): MaybePromise<ModificationResult> | undefined {
        return this.deleteModel(rootModelId, transitionId, (domain, id) => domain.identifiedTransitions.get(id), this.computeTransitionDeletion.bind(this))
    }

    private deleteModel<SEM extends sem.IdentifiedNode>(rootModelId: string, modelId: string,
        resolveModel: (domain: TaskListSemanticDomain, id: string) => SEM | undefined, computeModelDeletion: (document: LmsDocument, model: SEM) => [SourceEdit, string]
    ): MaybePromise<ModificationResult> | undefined {

        const lmsDocument = this.getDocumentById(rootModelId)
        if (!lmsDocument) {
            return undefined
        }
        const model = resolveModel(lmsDocument.semanticDomain, modelId)
        if (!model) {
            return ModificationResult.failedValidation('Unable to resolve model by id ' + modelId)
        }

        const sourceEditAndLabel = computeModelDeletion(lmsDocument, model)

        return this.applySourceEdit(...sourceEditAndLabel)
    }

    private computeTaskCreation(lmsDocument: TaskListDocument, newTask: Creation<Task>, anchorModel?: semantic.IdentifiedTask): TextEdit {

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

    private computeTransitionCreation({ sourceTask, targetTask }: semantic.IdentifiedTransitionProperties,
        anchorModel?: semantic.IdentifiedTransition): TextEdit {

        if (!sourceTask.$cstNode) {
            throw new Error('Cannot locate source task ' + sourceTask.name + '(' + sourceTask.$identity.id + ') in text')
        }

        let prefix = (!sourceTask.transitions || sourceTask.transitions.length === 0)
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

    private computeTaskUpdate(task: semantic.IdentifiedTask, taskModification: Modification<Task>): SourceEdit | undefined {
        console.debug('Computing Update edit for Task with name', task.name)
        if (!task.$cstNode) {
            throw new Error('Cannot locate task ' + task.name + '(' + task.$identity.id + ') in text')
        }
        if (taskModification.content || taskModification.name) {
            const serializedTask = `task ${taskModification.name ?? task.name} "${taskModification.content ?? task.content}"`
            const start = task.$cstNode.range.start
            const end = findNodeForProperty(task.$cstNode, 'content')?.range.end ?? task.$cstNode.range.end

            const taskTextEdit = TextEdit.replace({ start, end }, serializedTask)
            const taskDocumentUri = getDocument(task).uri
            const result = taskModification.name
                ? this.textEditService.computeAstNodeRename(task, taskModification.name, false)
                : new SourceEdit()
            result.add(taskDocumentUri, taskTextEdit)
            return result
        }
        return undefined
    }

    private computeTransitionUpdate(lmsDocument: LmsDocument, transition: semantic.IdentifiedTransition, newTransitionProps: semantic.IdentifiedTransitionProperties): SourceEdit {
        if (!transition.$cstNode) {
            throw new Error('Cannot locate model ' + transition.$identity.name + '(' + transition.$identity.id + ') in text')
        }
        const sourceEdit = new SourceEdit()
        if (newTransitionProps.sourceTask !== transition.$props.sourceTask) {
            sourceEdit.apply(this.computeTransitionDeletion(lmsDocument, transition)[0])
            sourceEdit.add(lmsDocument.uri, this.computeTransitionCreation(newTransitionProps))
        } else if (newTransitionProps.targetTask !== transition.$props.targetTask) {
            const serializedModel = newTransitionProps.targetTask.name
            sourceEdit.add(lmsDocument.uri, TextEdit.replace(transition.$cstNode.range, serializedModel))
        }
        return sourceEdit
    }

    private computeTaskDeletion(lmsDocument: LmsDocument, task: semantic.IdentifiedTask, ignoreReferencesFromTasks?: Set<string>): [SourceEdit, string] {

        console.debug('Computing Deletion edit for Task with name', task.name)
        if (!task.$cstNode) {
            throw new Error('Cannot locate model ' + task.name + '(' + task.$identity.id + ') in text')
        }

        const start = task.$cstNode.range.start
        const end = getNextNode(task.$cstNode, false)?.range?.start ?? {line: lmsDocument.textDocument.lineCount, character: 0}
        const deleteTaskEdit = TextEdit.del({ start, end })
        const sourceEdit = SourceEdit.ofSingleEdit(lmsDocument.uri, deleteTaskEdit)
        this.references.findReferences(task, { includeDeclaration: false })
            .map((ref): [document: LmsDocument, transition: semantic.IdentifiedTransition] | undefined => {
                const doc = this.langiumDocuments.getOrCreateDocument(ref.sourceUri) as LmsDocument
                const sourceTask = getContainerOfType(this.astNodeLocator.getAstNode(doc.parseResult.value, ref.sourcePath), ast.isTask)
                if (!this.isLmsDocument(doc) || !sourceTask || !sem.Identified.is(sourceTask)) {
                    console.debug('Source document or source task are not LMS-compatible', doc, sourceTask)
                    return undefined
                }
                if (ignoreReferencesFromTasks && ignoreReferencesFromTasks.has(sourceTask.$identity.id)) {
                    console.debug(`Transition from source Task ${sourceTask.$identity.id} (${sourceTask.name}) ignored`)
                    return undefined
                }
                const transitionName = identity.TransitionName.of(sourceTask.$identity.id, task.$identity.id)
                const transitionId = this.identityManager.getIdentityIndex(doc).transitions.byName(transitionName)?.id
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
                return [doc, transition]
            }).nonNullable()
            .forEach(([document, transition]) => {
                const [transitionDeletionEdit] = this.computeTransitionDeletion(document, transition)
                sourceEdit.apply(transitionDeletionEdit)
            })

        return [sourceEdit, 'Deleted task ' + task.name]
    }

    // TODO: Extract to separate component (that will be responsible for TextEdit computation)
    private computeTransitionDeletion(lmsDocument: LmsDocument, transition: semantic.IdentifiedTransition): [SourceEdit, string] {

        console.debug('Computing Deletion edit for Transition with name', transition.$identity.name)
        const task = transition.$props.sourceTask
        if (!transition.$cstNode || !task.$cstNode) {
            throw new Error('Cannot locate model ' + transition.$identity.name + '(' + transition.$identity.id + ') in text')
        }
        if (transition.$containerIndex === undefined) {
            throw new Error('Expected Transition containerIndex to be defined')
        }

        let start: Position
        let end: Position
        if (task.transitions.length > 1) {
            if (transition.$containerIndex === 0) {
                const nextNode = task.transitions[1].$cstNode!
                start = transition.$cstNode.range.start
                end = nextNode.range.start
            } else {
                const previousNode = task.transitions[transition.$containerIndex - 1].$cstNode!
                start = previousNode.range.end
                end = transition.$cstNode.range.end
            }
        } else {
            const previousNode = findNodeForProperty(task.$cstNode, 'content') ?? task.$cstNode
            start = previousNode.range.end
            end = transition.$cstNode.range.end
        }
        const sourceEdit = SourceEdit.ofSingleEdit(lmsDocument.uri, TextEdit.del({ start, end }))

        return [sourceEdit, 'Deleted transition ' + transition.$identity.name]
    }

    private applyTextEdit(lmsDocument: LmsDocument, textEdit: TextEdit, label: string, rollback?: id.StateRollback): Promise<ModificationResult> {
        return this.applySourceEdit(SourceEdit.ofSingleEdit(lmsDocument.uri, textEdit), label, rollback)
    }

    private applySourceEdit(sourceEdit: SourceEdit, label: string, rollback?: id.StateRollback): Promise<ModificationResult> {
        for (const uri of sourceEdit.getAffectedURIs()) {
            const lmsDocument = this.langiumDocuments.getOrCreateDocument(uri)
            if (this.isLmsDocument(lmsDocument)) {
                lmsDocument.hasImmediateChanges = true
            }
        }
        return this.connection.sendRequest(ApplyWorkspaceEditRequest.type,
            { label, edit: sourceEdit.toWorkspaceEdit() }
        ).then(editResult => editResult.applied
            ? ModificationResult.successful()
            : ModificationResult.failedTextEdit(editResult.failureReason)
        ).then(editingResult => {
            if (editingResult.successful) {
                console.debug(label)
            } else {
                !rollback || rollback()
            }
            return editingResult
        }, failure => {
            !rollback || rollback()
            return failure
        })
    }

    protected override convertSemanticModelToSourceModel(lmsDocument: LmsDocument): Model | undefined {

        if (!isTaskListDocument(lmsDocument) || !LmsDocument.isInitialized(lmsDocument)) {
            return undefined
        }
        const sourceModel = Model.createEmpty(lmsDocument.semanticDomain.rootId)
        for (const task of lmsDocument.semanticDomain.identifiedTasks.values()) {
            sourceModel.tasks.push(Task.create(task))
        }

        for (const transition of lmsDocument.semanticDomain.identifiedTransitions.values()) {
            sourceModel.transitions.push(Transition.create(transition))
        }
        return sourceModel
    }
}
