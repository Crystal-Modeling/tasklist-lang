
export function isDefined<T>(el: T | undefined): el is T {
    return el !== undefined
}
