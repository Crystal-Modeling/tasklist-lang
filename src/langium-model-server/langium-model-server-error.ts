export class LangiumModelServerError extends Error {
    // eslint-disable-next-line @typescript-eslint/no-parameter-properties
    constructor(message: string, override readonly cause?: unknown) {
        super(message)
    }
}
