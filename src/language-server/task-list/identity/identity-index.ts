import { AstNodeIndexedIdentities, DerivativeIndexedIdentities, type IdentityIndex, type IndexedIdentities } from '../../../langium-model-server/identity/identity-index'
import type { AstNodeIdentityName } from '../../../langium-model-server/identity/model'
import { Identity, ModelUri } from '../../../langium-model-server/identity/model'
import type * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'
import type { TaskIdentity, TransitionIdentity } from './model'
import { TransitionName } from './model'
import { type ModelIdentityModel } from './storage'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    public readonly tasks: IndexedIdentities<ast.Task, AstNodeIdentityName, TaskIdentity>
    public readonly transitions: IndexedIdentities<semantic.Transition, TransitionName, TransitionIdentity>

    public constructor(rootIdentityModel: ModelIdentityModel) {
        this.id = rootIdentityModel.id
        const tasks = new AstNodeIndexedIdentities<ast.Task, TaskIdentity>(id =>
            // TODO: Here I hardcode ModelUri of Task -- it should be taken from some centralized place (LMS grammar?)
            ModelUri.ofSegments(
                ModelUri.Segment.property('tasks'),
                ModelUri.Segment.id(id)
            ))
        rootIdentityModel.tasks.forEach(tasks.load.bind(tasks))
        this.tasks = tasks
        const transitions = new DerivativeIndexedIdentities<semantic.Transition, TransitionName, TransitionIdentity>(id =>
            // TODO: Here I hardcode ModelUri of Transition -- it should be taken from some centralized place (LMS grammar?)
            ModelUri.ofSegments(
                ModelUri.Segment.property('transitions'),
                ModelUri.Segment.id(id)
            ), TransitionName)
        rootIdentityModel.transitions.forEach(transitions.load.bind(transitions))
        this.transitions = transitions
    }

    protected get model(): ModelIdentityModel {
        return {
            id: this.id,
            tasks: Array.from(this.tasks.values(), Identity.toModel),
            transitions: Array.from(this.transitions.values(), Identity.toModel)
        }
    }

}
