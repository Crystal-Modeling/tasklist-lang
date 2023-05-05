import { AbstractSemanticModelStorage, SemanticModelStorage } from "../../../source-model-server/source-model/semantic-model-storage";

export class TaskListSemanticModelStorage extends AbstractSemanticModelStorage implements SemanticModelStorage {

    saveSemanticModel(): void {
        console.debug("Saving source model...")
    }
}