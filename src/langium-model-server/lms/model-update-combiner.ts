import type * as id from '../semantic/identity'
import type { Update } from './model'

export interface ModelUpdateCombiner<SM extends id.SemanticIdentity> {

    /**
     * Combines updates made during several reconciliation phases (updates accumulate if during the last phase an update was not sent).
     * If `updates` is an empty array -- returns `undefined`
     * If `updates` has only 1 element -- returns this element unmodified
     * Else squashes elements into the new Update, and returns it.
     * @param updates Updates to flatten into a single update
     */
    combineUpdates(updates: Array<Update<SM>>): Update<SM> | undefined
}
