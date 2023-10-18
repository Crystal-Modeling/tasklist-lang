import { DefaultDocumentValidator } from 'langium'

import type { Diagnostic } from 'vscode-languageserver'
import { CancellationToken } from 'vscode-languageserver'
import type { AstNode, LangiumDocument,  DiagnosticInfo, ValidationAcceptor } from 'langium'
import { streamAst, interruptAndCheck } from 'langium'

export class LmsDocumentValidator extends DefaultDocumentValidator {

    protected override async validateAst(rootNode: AstNode, document: LangiumDocument, cancelToken = CancellationToken.None): Promise<Diagnostic[]> {
        const validationItems: Diagnostic[] = []
        const acceptor: ValidationAcceptor = this.createValidationAcceptor(validationItems)

        await Promise.all(streamAst(rootNode).map(async node => {
            await interruptAndCheck(cancelToken)
            const checks = this.validationRegistry.getChecks(node.$type)
            for (const check of checks) {
                await check(node, acceptor, cancelToken)
            }
        }))
        return validationItems
    }

    protected createValidationAcceptor(validationItems: Diagnostic[]): ValidationAcceptor {
        return <N extends AstNode>(severity: 'error' | 'warning' | 'info' | 'hint', message: string, info: DiagnosticInfo<N>) => {
            validationItems.push(this.toDiagnostic(severity, message, info))
        }
    }
}
