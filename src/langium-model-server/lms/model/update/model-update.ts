import type * as id from '../../../semantic/identity'
import { Update } from './update'

export type ModelUpdate<T extends id.SemanticIdentity, S extends string = never> = Update<T, S> & id.ModelUri
export namespace ModelUpdate {

    export function createEmpty<T extends id.SemanticIdentity, S extends string = never>(id: string, modelUri: string): ModelUpdate<T, S> {
        const update = Update.createEmpty<T, S>(id)
        return Object.assign(update, { modelUri })
    }
}
