import { isIterable } from "./iterables"

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

export function defer(): {
  promise: Promise<void>,
  resolve: () => void,
  reject: (error: any) => void
}
export function defer<T>(): {
  promise: Promise<T>,
  resolve: (value: T) => void,
  reject: (error: any) => void
}
export function defer() {
  let resolve: any, reject: any

  const promise = new Promise((_resolve, _reject) => {
    resolve = _resolve, reject = _reject
  })

  return {
    promise,
    resolve,
    reject
  } as any
}

const neverPromise = new Promise(() => { }) as Promise<never>
export function never(): Promise<never> {
  return neverPromise
}

export async function wrapAsync<T>(fn: () => T | Promise<T>) {
  return await fn()
}

export function ms(milliseconds = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

export type PossiblyAsyncResult<T> = void | T | Promise<void | T> | Iterable<T | Promise<T>> | Promise<Iterable<T | Promise<T>>> | AsyncIterable<T> | Promise<AsyncIterable<T>>

export function isPromise(p: any): p is Promise<any> {
  if (p === null || p === undefined) {
    return false
  } else {
    return ("then" in p) && (typeof p === "function")
  }
}

/**
 * @param result A value, Iterable of values, mixed Iterable of values and Promises of values, Async Iterable, or Promise wrapping any of the above.
 * @param consumer The async function to be called for every value yielded within the span of the result's returned Promise
 */
export async function iterateOverAsyncResult<T>(
  result: PossiblyAsyncResult<T>,
  consumer: (t: T) => void | Promise<void>
): Promise<void> {
  const awaited = await result
  if (awaited !== undefined) {
    if (Symbol.asyncIterator in awaited) {
      for await (const t of awaited as AsyncIterable<T>) {
        await consumer(t)
      }
    } else if (Symbol.iterator in awaited) {
      for (const t of awaited as Iterable<T | Promise<T>>) {
        await consumer(await t)
      }
    } else {
      await consumer(awaited as T)
    }
  }
}
