
import * as fs from 'fs-extra'
import type { LanguageMetaData } from 'langium'
import path from 'path'
import { fileURLToPath } from 'url'
import { URI } from 'vscode-uri'
import type { LangiumModelServerServices } from '../services'
import type { TypeGuard } from '../utils/types'
import { UriConverter } from '../utils/uri-converter'
import type { LmsDocument } from '../workspace/documents'
import type { SemanticIdentifier } from './model'
import { IdentityError } from './model'
import type { IdentityIndex } from './indexed'

export interface IdentityStorage {
    saveIdentityToFile(languageDocumentUri: string, identity: unknown): void
    loadIdentityFromFile<T>(languageDocumentUri: string, guard: TypeGuard<T>): T
    deleteIdentityFile(languageDocumentUri: string): void
    renameIdentityFile(oldLanguageDocumentUri: string, newLanguageDocumentUri: URI): void
}

/**
 * Copied and adopted from @eclipse-glsp/server-node/src/features/model/abstract-json-model-storage.ts
 */
export abstract class AbstractIdentityStorage<SM extends SemanticIdentifier, II extends IdentityIndex, D extends LmsDocument> implements IdentityStorage {

    private languageMetaData: LanguageMetaData

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        this.languageMetaData = services.LanguageMetaData
    }

    public saveIdentityToFile(languageDocumentUri: string, identity: unknown): void {
        console.debug('Saving identity...')
        const uri = this.convertLangiumDocumentUriIntoIdentityUri(URI.parse(languageDocumentUri)).toString()
        this.writeFile(uri, identity)
    }

    public loadIdentityFromFile<T>(languageDocumentUri: string, guard: TypeGuard<T>): T {
        console.debug('Loading identity for URI', languageDocumentUri)
        const uri = this.convertLangiumDocumentUriIntoIdentityUri(URI.parse(languageDocumentUri)).toString()
        return this.loadFromFile(uri, guard)
    }

    public deleteIdentityFile(languageDocumentUri: string): void {
        console.debug('Deleting identity for URI', languageDocumentUri)
        const uri = this.convertLangiumDocumentUriIntoIdentityUri(URI.parse(languageDocumentUri)).toString()
        this.deleteFile(uri)
    }

    public renameIdentityFile(oldLanguageDocumentUri: string, newLanguageDocumentUri: URI): void {
        console.debug('Renaming identity from URI', oldLanguageDocumentUri, '\nto URI', newLanguageDocumentUri)
        const uri = this.convertLangiumDocumentUriIntoIdentityUri(URI.parse(oldLanguageDocumentUri)).toString()
        const newUri = this.convertLangiumDocumentUriIntoIdentityUri(newLanguageDocumentUri).toString()
        fs.renameSync(this.uriToPath(uri), this.uriToPath(newUri))
    }

    protected convertLangiumDocumentUriIntoIdentityUri(langiumDocumentUri: URI): URI {
        return UriConverter.of(langiumDocumentUri)
            .putFileInSubFolder('identity')
            .replaceFileExtension(this.languageMetaData.fileExtensions, '.json')
            .apply((_, path) => console.debug('Identity path is', path))
            .toUri()
    }

    protected loadFromFile(sourceUri: string): unknown
    protected loadFromFile<T>(sourceUri: string, guard: TypeGuard<T>): T
    protected loadFromFile<T>(sourceUri: string, guard?: TypeGuard<T>): T | unknown {
        try {
            const path = this.uriToPath(sourceUri)
            let fileContent = this.readFile(path)
            if (!fileContent) {
                fileContent = this.createIdentityForEmptyFile(path)
                if (!fileContent) {
                    throw new IdentityError(`Could not load the identity. The file '${path}' is empty!.`)
                }
                this.writeFile(path, fileContent)
            }
            if (guard && !guard(fileContent)) {
                throw new Error('The loaded root object is not of the expected type!')
            }
            return fileContent
        } catch (error) {
            throw new IdentityError(`Could not load model from file: ${sourceUri}`, error)
        }
    }

    /**
     * Can be overwritten to customize the behavior if the given file path points to an empty file.
     * The default implementation returns undefined, concrete subclasses can customize this behavior and
     * return new semantic identity object instead.
     * @param path The path of the empty file.
     * @returns The new semantic identity or `undefined`
     */
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    protected createIdentityForEmptyFile(path: string): unknown | undefined {
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
            throw new IdentityError(`Could not read & parse file contents of '${path}' as json`, error)
        }
    }
    protected writeFile(fileUriOrPath: string, model: unknown): void {
        const filePath = this.uriToPath(fileUriOrPath)
        const content = this.stringifyModel(model)
        const dirPath = path.dirname(filePath)
        fs.mkdir(dirPath, { recursive: true })
        fs.writeFileSync(filePath, content)
    }

    protected deleteFile(fileUriOrPath: string): void {
        const filePath = this.uriToPath(fileUriOrPath)
        fs.rmSync(filePath, { force: true })
    }

    protected uriToPath(sourceUriOrPath: string): string {
        return sourceUriOrPath.startsWith('file://') ? fileURLToPath(sourceUriOrPath) : sourceUriOrPath
    }

    protected parseContent(fileContent: string): unknown {
        return JSON.parse(fileContent)
    }

    protected stringifyModel(model: unknown): string {
        return JSON.stringify(model, undefined, 2)
    }
}
