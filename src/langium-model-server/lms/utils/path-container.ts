
export class PathContainer {
    private _suffix: string

    public get suffix(): string {
        return this._suffix
    }

    public constructor(suffix: string) {
        this._suffix = suffix
    }

    /**
     * Checks whether unmatched path starts with '/'
     */
    public hasPathSegments(): boolean {
        return (this.testPathSegmentSuffixMatch('') !== undefined)
    }

    /**
     * Reads segment from the beginning of the path: `/${segmentValue}`. If specified `segmentValue` equals to the segment
     * (i.e., it matches characters between the path delimimiter ('/') and another path delimiter or query character ('?') or end of the path),
     * then segmentValue is returned and matched segment is eliminated from the {@link PathContainer}.
     * If `segmentValue` is not provided, then attempts to match the path segment and return its value, also eliminating from the path.
     * If the match is unsuccessful, returns `undefined` and leaves the path unchanged.
     */
    public readPathSegment(segmentValue?: string): string | undefined {
        if (segmentValue !== undefined) {
            if (segmentValue.length === 0) {
                console.warn('Reading empty path segment (segmentValue is empty). This is most probably unintentionally')
            }
            const nextSegmentStart = this.testPathSegmentSuffixMatch(segmentValue)
            if (nextSegmentStart === undefined || !this.isPathSegmentEnd(nextSegmentStart)) {
                return undefined
            }
            this._suffix = this._suffix.substring(nextSegmentStart)
            return segmentValue
        }
        return this.matchPrefix(/^\/[^\/?]*/)?.substring(1)
    }

    /**
     * Reads query params (`?param=value&otherParam=value`) from the beginning of the path
     */
    public readQueryParams(): Record<string, string | undefined> | undefined {
        const queryParamsText = this.matchPrefix(/^[?].*/)?.slice(1)
        if (!queryParamsText) return undefined
        const queryParams: Record<string, string | undefined> = {}
        queryParamsText.split('&').forEach(queryParam => {
            const assignment = queryParam.split('=', 2)
            queryParams[assignment[0]] = assignment[1]
        })
        return queryParams
    }

    /**
     * If successful, returns the index of the first unmatched character in the path after the matched path segment ('/' + segmentValue)
     * Else returns `undefined`
     */
    private testPathSegmentSuffixMatch(segmentValue: string): number | undefined {
        if (!this._suffix.startsWith('/' + segmentValue)) {
            return undefined
        }
        return segmentValue.length + 1
    }

    private isPathSegmentEnd(pathIndex: number): boolean {
        return this._suffix.length === pathIndex || this._suffix[pathIndex] === '/' || this._suffix[pathIndex] === '?'
    }

    /**
     * If {@link PathContainer}.`suffix` begins with `prefix`, then this prefix is removed from `suffix`
     * and method returns the matched prefix.
     * Otherwise {@link PathContainer} remains unmodified and method returns `undefined`.
     *
     * @param prefix A RegExp against which existing `suffix` is matched
     */
    private matchPrefix(prefix: RegExp): string | undefined {
        const matchResult = this._suffix.match(prefix)
        if (!matchResult) {
            return undefined
        }
        const prefixString = matchResult[0]
        this._suffix = this._suffix.substring(prefixString.length)
        return prefixString
    }
}
