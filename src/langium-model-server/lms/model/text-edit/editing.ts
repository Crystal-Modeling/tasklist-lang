
export namespace EditingResult {
    export function successful(): EditingResult {
        return { successful: true, modified: true }
    }

    export function unmodified(): EditingResult {
        return { successful: true, modified: false }
    }

    export function failedValidation(validationError: string): EditingResult {
        return { successful: false, failureReason: EditingFailureReason.VALIDATION, failureMessage: validationError }
    }

    export function failedTextEdit(editFailureReason?: string): EditingResult {
        return { successful: false, failureReason: EditingFailureReason.TEXT_EDIT, failureMessage: editFailureReason }
    }
}

export type EditingResult = {
    successful: true,
    modified: boolean
} | {
    successful: false
    failureReason: EditingFailureReason,
    failureMessage?: string
}

export enum EditingFailureReason {
    VALIDATION = 'Validation',
    TEXT_EDIT = 'TextEdit'
}