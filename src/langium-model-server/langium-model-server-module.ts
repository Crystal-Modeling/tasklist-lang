import type { SemanticIndexManager } from './semantic/semantic-manager'
import type { SemanticModelStorage } from './semantic/semantic-storage'

export type LangiumModelServerServices = {
    semantic: {
        SemanticModelStorage: SemanticModelStorage,
        SemanticIndexManager: SemanticIndexManager,
    }
}
