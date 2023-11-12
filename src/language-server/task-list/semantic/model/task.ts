import type { AstNodeIdentityName } from '../../../../langium-model-server/identity/identity-name'
import type * as sem from '../../../../langium-model-server/semantic/model'
import type * as ast from '../../../generated/ast'

export type IdentifiedTask = sem.Identified<ast.Task, AstNodeIdentityName>
