
import * as fs from 'fs-extra';
import { fileURLToPath } from 'url';
import { SourceModelServerError } from '../source-model-server-error';
import { TypeGuard } from '../type-util';
import path from 'path';

export interface SemanticModelStorage {
    saveSemanticModel(languageDocumentUri: string): void
    loadSemanticModel(languageDocumentUri: string): void
    deleteSemanticModel(languageDocumentUri: string): void
}


/**
 * Copied and adopted from @eclipse-glsp/server-node/src/features/model/abstract-json-model-storage.ts
 */
export abstract class AbstractSemanticModelStorage implements SemanticModelStorage {

    public abstract saveSemanticModel(languageDocumentUri: string): void
    public abstract loadSemanticModel(languageDocumentUri: string): void
    public abstract deleteSemanticModel(languageDocumentUri: string): void

    protected loadFromFile(sourceUri: string): unknown
    protected loadFromFile<T>(sourceUri: string, guard: TypeGuard<T>): T
    protected loadFromFile<T>(sourceUri: string, guard?: TypeGuard<T>): T | unknown {
        try {
            const path = this.uriToPath(sourceUri);
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
            if (!fs.existsSync(path)) {
                return undefined
            }
            const data = fs.readFileSync(path, { encoding: 'utf8' });
            if (!data || data.length === 0) {
                return undefined;
            }
            return this.parseContent(data);
        } catch (error) {
            throw new SourceModelServerError(`Could not read & parse file contents of '${path}' as json`, error);
        }
    }
    protected writeFile(fileUri: string, model: unknown): void {
        const filePath = this.uriToPath(fileUri);
        const content = this.stringifyModel(model);
        const dirPath = path.dirname(filePath);
        fs.mkdir(dirPath, { recursive: true })
        fs.writeFileSync(filePath, content);
    }

    protected deleteFile(fileUri: string): void {
        const filePath = this.uriToPath(fileUri);
        fs.rmSync(filePath, { force: true })
    }

    protected uriToPath(sourceUri: string): string {
        return sourceUri.startsWith('file://') ? fileURLToPath(sourceUri) : sourceUri;
    }

    protected parseContent(fileContent: string): unknown {
        return JSON.parse(fileContent);
    }

    protected stringifyModel(model: unknown): string {
        return JSON.stringify(model, undefined, 2);
    }

    protected toString(model: unknown): string {
        return 'random stuff'
    }
}