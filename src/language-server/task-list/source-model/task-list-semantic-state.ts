import { getDocument } from "langium";
import { SemanticModelStorage } from "../../../source-model-server/source-model/semantic-storage";
import { Task } from "../../generated/ast";
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

    public getTaskId(task: Task): string | undefined {
        const languageDocumentUri = getDocument(task).textDocument.uri
        return this.get(languageDocumentUri).getTaskIdByName(task.name)
    }

    override get(languageDocumentUri: string): SemanticModelIndex {
        const loadedSemanticModel = super.get(languageDocumentUri)
        if (loadedSemanticModel) {
            return loadedSemanticModel
        }
        this.lazySemanticModelStorage().loadSemanticModel(languageDocumentUri)
        //HACK: Relying on the fact, that semanticModelStorage will load semantic model and put into semantic state (or else throw Error)
        return super.get(languageDocumentUri)!
    }

}