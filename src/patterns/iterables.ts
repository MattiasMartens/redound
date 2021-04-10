export function forEachIterable<T, V>(iterable: Iterable<T>, mapper: (t: T, i: number) => void): void {
  let i = 0
  for (const value of iterable) {
    mapper(value, i)
    i++
  }
}

export function* mapIterable<T, V>(iterable: Iterable<T>, mapper: (t: T, i: number) => V): Iterable<V> {
  let i = 0
  for (const value of iterable) {
    yield mapper(value, i)
    i++
  }
}

export function isIterable(obj: any) {
  // checks for null and undefined
  if (obj == null) {
    return false
  }
  return typeof obj[Symbol.iterator] === 'function'
}

export function* flatMap<T, V>(
  arr: Iterable<T>,
  fn: (value: T, index: number) => V | Iterable<V>
): Iterable<V> {

  let index = 0
  for (const val of arr) {
    index++

    const out = fn(val, index)

    if (isIterable(out)) {
      // @ts-ignore
      yield* out
    } else {
      // @ts-ignore
      yield out
    }
  }
}
