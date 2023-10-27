import type { Identifier } from '../../../langium-model-server/semantic/identifier'
import type * as sem from '../../../langium-model-server/semantic/model'
import type { Initialized } from '../../../langium-model-server/workspace/documents'
import type * as ast from '../../generated/ast'
import type { TaskListIdentityManager } from '../identity/manager'
import { TransitionName } from '../identity/model'
import type * as source from '../lms/model'
import type { TaskListServices } from '../task-list-module'
import { type TaskListDocument } from '../workspace/documents'

export class TaskListIdentifier implements Identifier<source.Model, TaskListDocument>{
    private identityManager: TaskListIdentityManager

    public constructor(services: TaskListServices) {
        this.identityManager = services.identity.IdentityManager
    }

    /* NOTE: So, the problem can be characterized as following:

    - I do mapping from existing structure (AST), not optimized for search element by derivative identity (name)
    - I do mapping to identity, which I have control for, therefore, can make it indexed, and optimized for data manipulations
    - That is why I traverse the language model!
    - When the source model (AST) is not linear (with nested submodels), I do traversing in several iterations.
    In previous iteration I prepare data for the next iteration (`targetTasksByMappedSourceTaskId`)
    - I need the concept of language model _semantical validity_, that is, which node from AST do I map to Source Model?
      = which AST node I assume correct enough to track his identity?
    */
    astIdentificationIterations = [
        // NOTE: ITERATION 1: mapping Tasks
        this.identifyTasks.bind(this),
        // NOTE: ITERATION 2: mapping Transitions
        this.identifyTransitions.bind(this),
    ]

    // Example of how Ast-based element is identified
    private identifyTasks(document: Initialized<TaskListDocument>, missingIdentities: sem.UnmappedIdentities<source.Model>) {

        // NOTE: Here I am expressing an idea, that perhaps I will have to have some sort of nested model indices,
        // which would make it generally necessary to pass the parent model into the semantic domain when requesting some (valid/identified) models
        const astModel: ast.Model = document.parseResult.value

        const taskIdentities = this.identityManager.getIdentityIndex(document).tasks
        const semanticDomain = document.semanticDomain

        const existingUnmappedIdentities = new Set(taskIdentities.values())
        // Actual mapping: marking semantic elements for deletion, and AST nodes to be added
        semanticDomain.getValidatedTasks(astModel)
            .forEach(task => {
                let taskIdentity = taskIdentities.byName(task.name)
                if (taskIdentity) {
                    existingUnmappedIdentities.delete(taskIdentity)
                } else {
                    taskIdentity = taskIdentities.addNew(task.name)
                }
                semanticDomain.identifyTask(task, taskIdentity)
            })

        missingIdentities.tasks = existingUnmappedIdentities
    }

    // Example of how non-Ast-based element is identified
    private identifyTransitions(document: Initialized<TaskListDocument>, missingIdentities: sem.UnmappedIdentities<source.Model>) {
        const transitionIdentities = this.identityManager.getIdentityIndex(document).transitions
        const semanticDomain = document.semanticDomain

        const existingUnmappedIdentities = new Set(transitionIdentities.values())
        semanticDomain.getValidatedTransitions()
            .forEach(transition => {
                const name = TransitionName.from(transition)
                let transitionIdentity = transitionIdentities.byName(name)
                if (transitionIdentity) {
                    existingUnmappedIdentities.delete(transitionIdentity)
                } else {
                    transitionIdentity = transitionIdentities.addNew(name)
                }
                semanticDomain.identifyTransition(transition, transitionIdentity)
            })

        missingIdentities.transitions = existingUnmappedIdentities
    }
}
