export class ValueBasedMap<K extends string[], V> {

    private map = new Map<string, V>()

    public constructor(map: Map<string, V> = new Map()) {
        this.map = map
    }

    copy(): ValueBasedMap<K, V> {
        return new ValueBasedMap(new Map(this.map))
    }

    clear(): void {
        this.map.clear()
    }

    delete(key: K): boolean {
        return this.map.delete(stringifyKey(key))
    }

    get(key: K): V | undefined {
        return this.map.get(stringifyKey(key))
    }

    has(key: K): boolean {
        return this.map.has(stringifyKey(key))
    }

    set(key: K, value: V): this {
        this.map.set(stringifyKey(key), value)
        return this
    }

    values(): IterableIterator<V> {
        return this.map.values()
    }

    get size(): number {
        return this.map.size
    }

}

function stringifyKey(key: string[]): string {
    return key.join('|')
}
