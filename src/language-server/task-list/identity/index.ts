import { type IdentityIndex, type IndexedIdentities } from '../../../langium-model-server/identity'
import { DerivativeIndexedIdentities } from '../../../langium-model-server/identity/derivative-indexed-identities'
import { AstNodeIndexedIdentities } from '../../../langium-model-server/identity/ast-indexed-identities'
import type { AstNodeIdentityName } from '../../../langium-model-server/identity/model'
import { ModelUri } from '../../../langium-model-server/identity/model'
import type * as ast from '../../generated/ast'
import type * as semantic from '../semantic/model'
import type { TaskIdentity, TransitionIdentity } from './model'
import { TransitionDerivativeName } from './model'
import { Task, Transition, type IdentityModel } from './storage'

export abstract class TaskListIdentityIndex implements IdentityIndex {
    public readonly id: string
    public readonly tasks: IndexedIdentities<ast.Task, AstNodeIdentityName, TaskIdentity>
    public readonly transitions: IndexedIdentities<semantic.Transition, TransitionDerivativeName, TransitionIdentity>

    public constructor(identityModel: IdentityModel) {
        this.id = identityModel.id
        const tasks = new AstNodeIndexedIdentities<ast.Task, TaskIdentity>(id =>
            // TODO: Here I hardcode ModelUri of Task -- it should be taken from some centralized place (LMS grammar?)
            ModelUri.ofSegments(
                ModelUri.Segment.property('tasks'),
                ModelUri.Segment.id(id)
            ))
        identityModel.tasks.forEach(task => tasks.add(task.id, task.name))
        this.tasks = tasks
        const transitions = new DerivativeIndexedIdentities<semantic.Transition, TransitionDerivativeName, TransitionIdentity>(id =>
            // TODO: Here I hardcode ModelUri of Transition -- it should be taken from some centralized place (LMS grammar?)
            ModelUri.ofSegments(
                ModelUri.Segment.property('transitions'),
                ModelUri.Segment.id(id)
            ))
        identityModel.transitions.forEach(transition => transitions.add(transition.id, TransitionDerivativeName.ofProperties(transition)))
        this.transitions = transitions
    }

    protected get model(): IdentityModel {
        return {
            id: this.id,
            tasks: Array.from(this.tasks.values(), Task.of),
            transitions: Array.from(this.transitions.values(), Transition.of)
        }
    }

}
