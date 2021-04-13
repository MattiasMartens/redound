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
 * @param primaryConsumer The async function to be called for every value yielded within the span of the result's returned Promise
 * @param secondaryConsumer The async function to be called for every value yielded after the returned Promise ends
 * @returns A Promise with an optional embedded function 'secondaryConsume'. When called, this function will resume iterating over async values. It resolves when all secondaryConsumer invocations are finished.
 */
export async function twoStepIterateOverAsyncResult<T>(
  result: PossiblyAsyncResult<T>,
  primaryConsumer: (t: T) => void | Promise<void>
): Promise<{
  secondaryConsume?: (
    secondaryConsumer: (t: T) => void | Promise<void>
  ) => Promise<void>
}> {
  const awaited = await result
  if (awaited !== undefined) {
    if (Symbol.asyncIterator in awaited) {
      return {
        secondaryConsume: async (secondaryConsumer: (t: T) => Promise<void>) => {
          for await (const t of awaited as AsyncIterable<T>) {
            await secondaryConsumer(t)
          }
        }
      }
    } else if (Symbol.iterator in awaited) {
      const iterator = awaited[Symbol.iterator]() as Iterator<T | Promise<T>>
      let iteratorResult: IteratorResult<T | Promise<T>>

      while (!(iteratorResult = iterator.next()).done) {
        const value = iteratorResult.value

        if (isPromise(value)) {
          return {
            secondaryConsume: async (secondaryConsumer: (t: T) => Promise<void>) => {
              const triggeringValue = await value
              await secondaryConsumer(triggeringValue)

              let secondaryIteratorResult: IteratorResult<T | Promise<T>>
              while (!(secondaryIteratorResult = iterator.next()).done) {
                const secondaryValue = await secondaryIteratorResult.value
                await secondaryConsumer(secondaryValue)
              }
            }
          }
        }
      }

      return {}
    } else {
      await primaryConsumer(awaited as T)
      return {}
    }
  } else {
    return {}
  }
}
