import { DefaultDocumentValidator } from 'langium'

import type { Diagnostic } from 'vscode-languageserver'
import { CancellationToken } from 'vscode-languageserver'
import type { AstNode, LangiumDocument, DiagnosticInfo, ValidationAcceptor } from 'langium'
import { streamAst, interruptAndCheck } from 'langium'
import type { LangiumModelServerServices } from '../services'
import type { SemanticIdentifier } from '../identity/model'
import type { IdentityIndex } from '../identity/identity-index'
import type { ExtendableLangiumDocument, LmsDocument } from '../workspace/documents'
import type { TypeGuard } from '../utils/types'

export class LmsDocumentValidator<SM extends SemanticIdentifier, II extends IdentityIndex, D extends LmsDocument> extends DefaultDocumentValidator {

    protected isLmsDocument: TypeGuard<D, ExtendableLangiumDocument>

    constructor(services: LangiumModelServerServices<SM, II, D>) {
        super(services)
        this.isLmsDocument = services.workspace.LmsDocumentGuard
    }

    protected override async validateAst(rootNode: AstNode, document: LangiumDocument, cancelToken = CancellationToken.None): Promise<Diagnostic[]> {
        const validationItems: Diagnostic[] = []
        const acceptor: ValidationAcceptor = this.createValidationAcceptor(validationItems, document)

        await Promise.all(streamAst(rootNode).map(async node => {
            await interruptAndCheck(cancelToken)
            const checks = this.validationRegistry.getChecks(node.$type)
            for (const check of checks) {
                await check(node, acceptor, cancelToken)
            }
        }))
        return validationItems
    }

    protected createValidationAcceptor(validationItems: Diagnostic[], document: LangiumDocument): ValidationAcceptor {
        if (this.isLmsDocument(document)) {
            return <N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N>) => {
                const affectedNode = document.semanticDomain?.getValidatedNode(info.node, info.property, info.index)
                if (affectedNode) {
                    affectedNode.$validation.push({ kind: severity, label: info.code?.toString() || affectedNode.$type, description: message })
                }
                validationItems.push(this.toDiagnostic(severity, message, info))
            }
        } else {
            return <N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N>) => {
                validationItems.push(this.toDiagnostic(severity, message, info))
            }
        }
    }
}
