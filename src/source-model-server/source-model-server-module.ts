import { SemanticIndexManager } from "./source-model/semantic-manager";
import { SemanticModelStorage } from "./source-model/semantic-storage";


export type SourceModelServices = {
    SemanticModelStorage: SemanticModelStorage,
    SemanticIndexManager: SemanticIndexManager,
}
