import type { URI } from 'vscode-uri'

export class UriConverter {

    public static of(uri: URI): UriConverter {
        return new UriConverter(uri, uri.path)
    }

    private uri: URI
    private path: string

    private constructor(uri: URI, path: string) {
        this.uri = uri
        this.path = path
    }

    /**
     * Puts the very file in a subfolder as specified by `subFolder` path fragment. The subfolder itself is concatenated with
     * the `uri` itself, excluding the file name.
     *
     * Example: For `uri` '/c/users/username/documents/file.txt' {@link putFileInSubFolder}`('my/personal')` will result in
     * '/c/users/username/documents/my/personal/file.txt' `uri`
     * @param subFolder A path fragment, naming a directory (or several nested directories) where to put the file identified by `uri`
     */
    public putFileInSubFolder(subFolder: string): UriConverter {
        const folderFileSeparator = this.path.lastIndexOf('/')
        const modifiedPath = this.path.slice(0, folderFileSeparator) + '/' + strip(subFolder, '/') + this.path.slice(folderFileSeparator)
        return new UriConverter(this.uri, modifiedPath)
    }

    public replaceFileExtension(newFileExtension: string): UriConverter {
        const modifiedPath = this.path.replace(/(?<=\.)[a-zA-Z0-9]+$/, strip(newFileExtension, '.'))
        if (!modifiedPath.endsWith(newFileExtension)) {
            return this.addFileExtension(newFileExtension)
        }
        return new UriConverter(this.uri, modifiedPath)
    }

    public addFileExtension(newFileExtension: string): UriConverter {
        const modifiedPath = this.path + '.' + strip(newFileExtension, '.')
        return new UriConverter(this.uri, modifiedPath)
    }

    public apply(func: (uri: URI, path: string) => void): this {
        func(this.uri, this.path)
        return this
    }

    public toUri(): URI {
        return this.uri.with({
            path: this.path
        })
    }
}

/**
 * @param str A string to strip
 * @param symbol A character (string of length 1) to strip {@link str} from
 * @returns Stripped {@link str}
 */
function strip(str: string, symbol: string): string {
    let begin = 0
    let end = str.length
    for (let i = begin; i < end; i++) {
        if (str.charAt(i) === symbol) begin++
        else break
    }
    for (let i = end - 1; i > begin; i--) {
        if (str.charAt(i) === symbol) end--
        else break
    }
    return str.substring(begin, end)
}
