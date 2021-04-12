export async function end(promise: Promise<any>) {
  try {
    await promise
  } catch (e) {
    // no-op  
  }
}

export async function voidPromiseIterable(iterable: Iterable<Promise<void>>) {
  for await (const i of iterable) { console.log(i) }
}

export function encapsulatePromise<T>(promise: Promise<T>) {
  return function <I extends any[], O>(fn: (eventual: T, ...args: I) => O) {
    return async function (...args: I) {
      const eventual = await promise
      return fn(eventual, ...args)
    }
  }
}

const neverPromise = new Promise(() => { }) as Promise<never>
export function never(): Promise<never> {
  return neverPromise
}

export async function wrapAsync<T>(fn: () => T | Promise<T>) {
  return await fn()
}