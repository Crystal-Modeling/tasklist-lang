
export interface ValidatingResolver<T, R extends T = T> {
    property(prop: keyof T): PropertyResolver<T, R, typeof prop>
    go(): R | string
}

export namespace ValidatingResolver {
    export function resolve<T extends object>(entity: T): ValidatingResolver<T> {
        const _input = entity
        const _output = { ...entity }
        const _unresolvedReferences: string[] = []
        const _propsResolvers: Array<() => void> = []

        const resolver: ValidatingResolver<T, T> = {
            property(prop) {

                return {
                    to(resolutionProp, query, subject) {
                        _propsResolvers.push(() => {
                            const resolution = query(_input[prop])
                            if (!resolution) {
                                _unresolvedReferences.push(subject + ' ' + prop.toString())
                            } else {
                                Object.assign(_output, { [resolutionProp]: resolution })
                            }
                        })

                        return resolver as ValidatingResolver<T, Resolve<T, typeof resolutionProp, NonNullable<ReturnType<typeof query>>>>
                    },
                }
            },
            go() {
                if (_unresolvedReferences.length > 0) {
                    return _unresolvedReferences.join(', ')
                }
                for (const propToResolve of _propsResolvers) {
                    propToResolve()
                }
                return _output
            },
        }

        return resolver
    }
}

interface PropertyResolver<T, R extends T, P extends keyof T> {
    to<RP extends string, E extends NonNullable<object>>(resolutionProp: RP, query: (id: T[P]) => E | undefined, subject: string): ValidatingResolver<T, Resolve<R, RP, E>>
}

export type Resolve<T, P extends string | number | symbol, R> = T & {
    [I in P]: R
}

export function test() {
    const data = {
        id: 'asdfasdfa',
        sourceTaskId: 'asdfasdf2ea',
        targetTaskId: '2302949ridwfaf9w'
    }
    const resolvedData = ValidatingResolver.resolve(data)
        .property('id').to('resolvedId', (id) => ({ message: 'I am resolved!', by: id }), 'root model by id')
        .property('sourceTaskId').to('sourceTask', (id) => ({id, name: 'Task Name'}), 'source Task by id')
        .go()
    if (typeof resolvedData === 'string') {
        console.warn('Unable to resolve: ' + resolvedData)
    } else {
        resolvedData.resolvedId
    }
}
