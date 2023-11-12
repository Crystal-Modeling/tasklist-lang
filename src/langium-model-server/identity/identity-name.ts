
export type DerivativeIdentityName = object
export type AstNodeIdentityName = string
export namespace AstNodeIdentityName {
    export function is(name: IdentityName): name is AstNodeIdentityName {
        return typeof name === 'string'
    }
}
export type IdentityName = AstNodeIdentityName | DerivativeIdentityName
