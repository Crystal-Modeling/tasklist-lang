import type * as id from '../../../identity/model'
import { Update } from './update'

export type RootUpdate<T extends id.SemanticIdentity, S extends string = never> = Update<T, S> & id.ModelUri
export namespace RootUpdate {

    export function createEmpty<T extends id.SemanticIdentity, S extends string = never>(id: string, modelUri: string): RootUpdate<T, S> {
        const update = Update.createEmpty<T, S>(id)
        return Object.assign(update, { modelUri })
    }
}
