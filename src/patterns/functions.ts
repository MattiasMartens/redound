export function identity<T>(t: T) {
  return t
}

export const noop = (() => { }) as ((...args: any[]) => undefined)
export const noopAsync = (async () => { }) as ((...args: any[]) => Promise<undefined>)

export function mutate<T>(item: T, mutation: (item: T) => any) {
  mutation(item)
  return item
}

function* lazyGenerator<T>(getter: () => T) {
  const value = getter()
  while (true) {
    yield value
  }
}

export function lazy<T>(getter: () => T) {
  const generator = lazyGenerator(getter)

  return () => generator.next().value as T
}

export function call(fn: () => void) {
  fn()
}

export function pick<T extends object, K extends keyof T>(k: K): (item: T) => T[K] {
  return (item: T) => item[k]
}

/**
 *
 * @returns A function called on an object of type T
 * that returns true if and only if that object
 * Has a key-value pair matching the single
 * key-value pair in the argument.
 */
export function match<T, SubT extends T, K extends keyof SubT>(queryLiteral: { [k in K]: SubT[K] }) {
  let matchKey: K = "" as any
  for (const key in queryLiteral) {
    matchKey = key
    break
  }

  const matchVal = queryLiteral[matchKey]

  return (obj: T) => (obj as SubT)[matchKey] === matchVal
}
