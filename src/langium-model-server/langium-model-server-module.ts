import type { LangiumServices } from 'langium'
import type { SemanticIndexManager } from './semantic/semantic-manager'
import type { SemanticModelStorage } from './semantic/semantic-storage'
import type { SourceModelService } from './source/source-model-service'

export type LangiumModelServerAddedServices<SM=object, SemI=object> = {
    semantic: {
        SemanticModelStorage: SemanticModelStorage,
        SemanticIndexManager: SemanticIndexManager<SemI>,
    },
    source: {
        SourceModelService: SourceModelService<SM>,
    }
}

export type LangiumModelServerServices<SM, SemI> = LangiumServices & LangiumModelServerAddedServices<SM, SemI>
