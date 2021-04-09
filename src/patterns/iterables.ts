export function forEachIterable<T, V>(iterable: Iterable<T>, mapper: (t: T, i: number) => void): void {
  let i = 0
  for (const value of iterable) {
    mapper(value, i)
    i++
  }
}
