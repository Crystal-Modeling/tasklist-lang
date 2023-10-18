
export function embedIndex<T extends object>(el: T, index: number): T & { index: number } {
    return Object.assign(el, { index })
}
