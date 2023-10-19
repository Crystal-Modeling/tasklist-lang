
export namespace ModificationResult {
    export function successful(): ModificationResult {
        return { successful: true, modified: true }
    }

    export function unmodified(): ModificationResult {
        return { successful: true, modified: false }
    }

    export function failedValidation(validationError: string): ModificationResult {
        return { successful: false, failureReason: EditingFailureReason.VALIDATION, failureMessage: validationError }
    }

    export function failedTextEdit(editFailureReason?: string): ModificationResult {
        return { successful: false, failureReason: EditingFailureReason.TEXT_EDIT, failureMessage: editFailureReason }
    }
}

export type ModificationResult = {
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
