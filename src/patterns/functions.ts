export function identity<T>(t: T) {
  return t
}

export const noop = () => { }
export const noopAsync = async () => { }

export function mutate<T>(item: T, mutation: (item: T) => any) {
  mutation(item)
  return item
}