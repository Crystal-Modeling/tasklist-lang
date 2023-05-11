
import * as fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { TypeGuard } from '../type-util';
import { SourceModelServerError } from '../source-model-server-error';
import { URI } from 'vscode-uri';

export interface SemanticModelStorage {
    saveSemanticModel(languageDocumentUri: URI): void
    loadSemanticModel(languageDocumentUri: URI): void
}


/**
 * Copied and adopted from @eclipse-glsp/server-node/src/features/model/abstract-json-model-storage.ts
 */
export abstract class AbstractSemanticModelStorage {

    protected loadFromFile(sourceUri: string): unknown
    protected loadFromFile<T>(sourceUri: string, guard: TypeGuard<T>): T
    protected loadFromFile<T>(sourceUri: string, guard?: TypeGuard<T>): T | unknown {
        try {
            const path = this.toPath(sourceUri);
            let fileContent = this.readFile(path);
            if (!fileContent) {
                fileContent = this.createModelForEmptyFile(path);
                if (!fileContent) {
                    throw new SourceModelServerError(`Could not load the semantic model. The file '${path}' is empty!.`);
                }
            }
            if (guard && !guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!');
            }
            return fileContent;
        } catch (error) {
            throw new SourceModelServerError(`Could not load model from file: ${sourceUri}`, error);
        }
    }

    /**
     * Can be overwritten to customize the behavior if the given file path points to an empty file.
     * The default implementation returns undefined, concrete subclasses can customize this behavior and
     * return new source model object instead.
     * @param path The path of the empty file.
     * @returns The new model or `undefined`
     */
    protected createModelForEmptyFile(path: string): unknown | undefined {
        return undefined;
    }

    protected readFile(path: string): unknown | undefined {
        try {
            const data = fs.readFileSync(path, { encoding: 'utf8' });
            if (!data || data.length === 0) {
                return undefined;
            }
            return this.toJson(data);
        } catch (error) {
            throw new SourceModelServerError(`Could not read & parse file contents of '${path}' as json`, error);
        }
    }

    protected toJson(fileContent: string): unknown {
        return JSON.parse(fileContent);
    }

    protected toPath(sourceUri: string): string {
        return sourceUri.startsWith('file://') ? fileURLToPath(sourceUri) : sourceUri;
    }

    protected writeFile(fileUri: string, model: unknown): void {
        const path = this.toPath(fileUri);
        const content = this.toString(model);
        fs.writeFileSync(path, content);
    }

    protected toString(model: unknown): string {
        return JSON.stringify(model, undefined, 2);
    }
}