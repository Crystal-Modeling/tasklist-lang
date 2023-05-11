import { SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { TaskListServices } from "../task-list-module";
import { SemanticModel, SemanticModelIndex } from "./task-list-semantic-model";

/**
 * Stores {@link SemanticModel} per URI of Langium-managed TextDocument
 */
export class TaskListSemanticModelState extends Map<string, SemanticModelIndex> {
    
    private lazySemanticModelStorage: () => SemanticModelStorage

    public constructor(services: TaskListServices) {
        super()
        this.lazySemanticModelStorage = () => (services.sourceModel.SemanticModelStorage)
    }

    override get(languageDocumentUri: string): SemanticModelIndex {
        const loadedSemanticModel = super.get(languageDocumentUri)
        if (loadedSemanticModel) {
            return loadedSemanticModel
        }
        console.info(`Semantic model for document ${languageDocumentUri} was not loaded, but requested now.`)
        const semanticModelStorage = this.lazySemanticModelStorage()
        semanticModelStorage.loadSemanticModel(languageDocumentUri)
        //HACK: Relying on the fact, that semanticModelStorage will load semantic model and put into semantic state (or else throw Error)
        return super.get(languageDocumentUri)!
    }

}