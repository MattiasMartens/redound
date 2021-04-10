export async function end(promise: Promise<any>) {
  try {
    await promise
  } catch (e) {
    // no-op  
  }
}

export async function voidPromiseIterable(iterable: Iterable<Promise<void>>) {
  for await (const i of iterable) { i }
}

export function encapsulatePromise<T>(promise: Promise<T>) {
  return function <I extends any[], O>(fn: (eventual: T, ...args: I) => O) {
    return async function (...args: I) {
      const eventual = await promise
      return fn(eventual, ...args)
    }
  }
}
