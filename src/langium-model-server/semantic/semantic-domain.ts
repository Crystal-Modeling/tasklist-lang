
export interface SemanticDomain {
    clear(): void
}

export type SemanticDomainFactory = () => SemanticDomain
