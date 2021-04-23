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

export type PossiblyAsyncResult<T> = undefined | void | Promise<void | T> | Iterable<T | Promise<T>> | Promise<Iterable<T | Promise<T>>> | AsyncIterable<T> | AsyncIterable<T> | Generator<T> | AsyncGenerator<T>

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
 * @param interrupt A function that, if it returns true, will cause this function
 * to finish iterating.
 */
export async function iterateOverAsyncResult<T>(
  result: PossiblyAsyncResult<T>,
  consumer: (t: T) => void | Promise<void>,
  interrupt: () => boolean
): Promise<void> {
  if (result && Symbol.asyncIterator in result) {
    for await (const t of result as AsyncIterable<T>) {
      if (interrupt()) {
        return
      }

      await consumer(t)

      if (interrupt()) {
        return
      }
    }
  }

  const awaited = await result

  if (interrupt()) {
    return
  }

  if (awaited !== undefined) {
    if (Symbol.asyncIterator in awaited) {
      for await (const t of awaited as AsyncIterable<T>) {
        if (interrupt()) {
          return
        }

        await consumer(t)

        if (interrupt()) {
          return
        }
      }
    } else if (Symbol.iterator in awaited) {
      for (const t of awaited as Iterable<T | Promise<T>>) {
        const value = await t

        if (interrupt()) {
          return
        }

        await consumer(value)

        if (interrupt()) {
          return
        }
      }
    } else {
      await consumer(awaited as T)
    }
  }
}
