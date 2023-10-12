import type * as id from '../../../../langium-model-server/identity/model'
import type * as sem from '../../../../langium-model-server/semantic/model'
import type * as ast from '../../../generated/ast'

export type IdentifiedTask = sem.Identified<ast.Task, id.AstNodeIdentityName>
