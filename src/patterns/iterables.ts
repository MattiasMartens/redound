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
