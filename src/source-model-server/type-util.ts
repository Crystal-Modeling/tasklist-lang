
/**
 * Copied from @eclipse-glsp/protocol/src/utils/type-util.ts
 * 
 * Utility type to describe typeguard functions.
 */
export type TypeGuard<T> = (element: any, ...args: any[]) => element is T;