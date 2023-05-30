
import * as fs from 'fs-extra'
import { fileURLToPath } from 'url'
import { LangiumModelServerError } from '../langium-model-server-error'
import type { TypeGuard } from '../type-util'
import path from 'path'
import { URI } from 'vscode-uri'

export interface SemanticModelStorage {
    saveSemanticModelToFile(languageDocumentUri: string, model: unknown): void
    loadSemanticModelFromFile<T>(languageDocumentUri: string, guard: TypeGuard<T>): T
    deleteSemanticModelFile(languageDocumentUri: string): void
}

/**
 * Copied and adopted from @eclipse-glsp/server-node/src/features/model/abstract-json-model-storage.ts
 */
export abstract class AbstractSemanticModelStorage implements SemanticModelStorage {

    public saveSemanticModelToFile(languageDocumentUri: string, semanticModel: unknown): void {
        console.debug('Saving semantic model...')
        const uri = this.convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        this.writeFile(uri, semanticModel)
    }

    public loadSemanticModelFromFile<T>(languageDocumentUri: string, guard: TypeGuard<T>): T {
        console.debug('Loading semantic model for URI', languageDocumentUri)
        const uri = this.convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        return this.loadFromFile(uri, guard)
    }

    public deleteSemanticModelFile(languageDocumentUri: string): void {
        console.debug('Deleting semantic model for URI', languageDocumentUri)
        const uri = this.convertLangiumDocumentUriIntoSourceModelUri(URI.parse(languageDocumentUri)).toString()
        this.deleteFile(uri)
    }

    protected abstract convertLangiumDocumentUriIntoSourceModelUri(langiumDocumentUri: URI): URI

    protected loadFromFile(sourceUri: string): unknown
    protected loadFromFile<T>(sourceUri: string, guard: TypeGuard<T>): T
    protected loadFromFile<T>(sourceUri: string, guard?: TypeGuard<T>): T | unknown {
        try {
            const path = this.uriToPath(sourceUri)
            let fileContent = this.readFile(path)
            if (!fileContent) {
                fileContent = this.createModelForEmptyFile(path)
                if (!fileContent) {
                    throw new LangiumModelServerError(`Could not load the semantic model. The file '${path}' is empty!.`)
                }
            }
            if (guard && !guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!')
            }
            return fileContent
        } catch (error) {
            throw new LangiumModelServerError(`Could not load model from file: ${sourceUri}`, error)
        }
    }

    /**
     * Can be overwritten to customize the behavior if the given file path points to an empty file.
     * The default implementation returns undefined, concrete subclasses can customize this behavior and
     * return new source model object instead.
     * @param path The path of the empty file.
     * @returns The new model or `undefined`
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected createModelForEmptyFile(path: string): unknown | undefined {
        return undefined
    }

    protected readFile(path: string): unknown | undefined {
        try {
            if (!fs.existsSync(path)) {
                return undefined
            }
            const data = fs.readFileSync(path, { encoding: 'utf8' })
            if (!data || data.length === 0) {
                return undefined
            }
            return this.parseContent(data)
        } catch (error) {
            throw new LangiumModelServerError(`Could not read & parse file contents of '${path}' as json`, error)
        }
    }
    protected writeFile(fileUri: string, model: unknown): void {
        const filePath = this.uriToPath(fileUri)
        const content = this.stringifyModel(model)
        const dirPath = path.dirname(filePath)
        fs.mkdir(dirPath, { recursive: true })
        fs.writeFileSync(filePath, content)
    }

    protected deleteFile(fileUri: string): void {
        const filePath = this.uriToPath(fileUri)
        fs.rmSync(filePath, { force: true })
    }

    protected uriToPath(sourceUri: string): string {
        return sourceUri.startsWith('file://') ? fileURLToPath(sourceUri) : sourceUri
    }

    protected parseContent(fileContent: string): unknown {
        return JSON.parse(fileContent)
    }

    protected stringifyModel(model: unknown): string {
        return JSON.stringify(model, undefined, 2)
    }
}
