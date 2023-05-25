import type { SemanticIndexManager } from './source-model/semantic-manager'
import type { SemanticModelStorage } from './source-model/semantic-storage'

export type SourceModelServices = {
    SemanticModelStorage: SemanticModelStorage,
    SemanticIndexManager: SemanticIndexManager,
}
