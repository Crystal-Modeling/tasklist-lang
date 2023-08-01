import type * as id from '../semantic/identity'
import type { KeysOfType } from '../utils/types'
import type { ReadonlyArrayUpdate } from './model'

export type ModelUpdateCalculator<SM extends id.SemanticIdentity> = DeletionsCalculation<SM>

type DeletionsCalculation<T> = {
    [P in KeysOfType<T, id.SemanticIdentity[]> as `calculate${Capitalize<string & P>}Update`]: T[P] extends id.SemanticIdentity[] ? (identitiesToDelete: Iterable<T[P][0]>) => ReadonlyArrayUpdate<T[P][0]> : never
}
