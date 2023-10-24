import type { ValueBasedOperations } from './types'

/**
 * An abstraction over ES 2015 Map<K, V>, that does not implement iteration over key-value pairs.
 * The reason for this is that {@link ValueBasedMap} cannot implement such iteration *efficiently*.
 */
export interface AbstractMap<K, V> {

    values(): IterableIterator<V>

    clear(): void
    /**
     * @returns true if an element in the Map existed and has been removed, or false if the element does not exist.
     */
    delete(key: K): boolean
    /**
     * Returns a specified element from the Map object. If the value that is associated to the provided key is an object, then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
     * @returns Returns the element associated with the specified key. If no element is associated with the specified key, undefined is returned.
     */
    get(key: K): V | undefined
    /**
     * @returns boolean indicating whether an element with the specified key exists or not.
     */
    has(key: K): boolean
    /**
     * Adds a new element with a specified key and value to the Map. If an element with the same key already exists, the element will be updated.
     */
    set(key: K, value: V): this
    /**
     * @returns the number of elements in the Map.
     */
    readonly size: number
}

export class ValueBasedMap<K, V> implements AbstractMap<K, V> {

    private map = new Map<string, V>()
    private stringifyKey: (k: K) => string

    public constructor(stringify: ValueBasedOperations<K>['stringify'], map: Map<string, V> = new Map()) {
        this.map = map
        this.stringifyKey = stringify
    }

    copy(): ValueBasedMap<K, V> {
        return new ValueBasedMap(this.stringifyKey, new Map(this.map))
    }

    clear(): void {
        this.map.clear()
    }

    delete(key: K): boolean {
        return this.map.delete(this.stringifyKey(key))
    }

    get(key: K): V | undefined {
        return this.map.get(this.stringifyKey(key))
    }

    has(key: K): boolean {
        return this.map.has(this.stringifyKey(key))
    }

    set(key: K, value: V): this {
        this.map.set(this.stringifyKey(key), value)
        return this
    }

    values(): IterableIterator<V> {
        return this.map.values()
    }

    get size(): number {
        return this.map.size
    }

}

export function equal<K extends string[]>(right: K, left: K): boolean {
    if (right === left) return true
    if (right.length !== left.length) return false
    const len = right.length
    for (let i = 0; i < len; i++) {
        if (right[i] !== left[i]) return false
    }
    return true
}
