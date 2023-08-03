
import type * as id from '../../semantic/identity'
import type { OmitProperties } from '../../utils/types'

export interface CreationParams {
    anchorModelId?: string
}

export type Creation<T extends id.SemanticIdentity = id.SemanticIdentity> = OmitProperties<T, id.SemanticIdentity>

export type CreationResponse = { created: true } | {
    created: false
    failureReason: CreationFailureReason,
    failureMessage?: string
}

export namespace CreationResponse {
    export function created(): CreationResponse {
        return { created: true }
    }

    export function failedValidation(validationError: string): CreationResponse {
        return { created: false, failureReason: CreationFailureReason.VALIDATION, failureMessage: validationError }
    }

    export function failedTextEdit(editFailureReason?: string): CreationResponse {
        return { created: false, failureReason: CreationFailureReason.TEXT_EDIT, failureMessage: editFailureReason }
    }
}

export enum CreationFailureReason {
    VALIDATION = 'Validation',
    TEXT_EDIT = 'TextEdit'
}
