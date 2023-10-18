
export function embedElementIndices<T extends object>(elements: T[]): Array<T & { index: number }> {
    elements.forEach(embedIndex)
    return elements as Array<T & { index: number }>
}

export function embedIndex<T extends object>(el: T, index: number): T & { index: number } {
    return Object.assign(el, { index })
}
