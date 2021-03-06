import { constFalse } from "fp-ts/lib/function"
import { buildError, ErrorBuilder } from "./errors"

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

export type Deferred<T> = {
  promise: Promise<T>,
  resolve: (value: T | Promise<T>) => void,
  reject: (error: any) => void
}

export function defer(): {
  promise: Promise<void>,
  resolve: () => void,
  reject: (error: any) => void
}
export function defer<T>(): {
  promise: Promise<T>,
  resolve: (value: T | Promise<T>) => void,
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
    setTimeout(
      resolve,
      milliseconds
    )
  })
}

export function isPromise(p: any): p is Promise<any> {
  if (p === null || p === undefined) {
    return false
  } else {
    return ("then" in p) && (typeof p === "function")
  }
}

export type PossiblyAsyncResult<T> = undefined | Iterable<T> | Promise<undefined | Iterable<T>> | AsyncIterable<T> | Generator<T> | AsyncGenerator<T>

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

    return
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
    } else {
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
    }
  }
}

export async function* chainAsyncResults<T>(
  ...results: PossiblyAsyncResult<T>[]
): AsyncGenerator<T> {
  for (const result of results) {
    if (result === undefined) {
      // noop
    } else if (Symbol.asyncIterator in result) {
      yield* (result as any)
    } else {
      const awaited = await result

      if (awaited === undefined) {
        // noop
      } else {
        yield* (awaited as any)
      }
    }
  }
}

export async function* transformAsyncResult<T, O>(
  result: PossiblyAsyncResult<T>,
  transform: (t: T) => O
): AsyncGenerator<O> {
  if (result === undefined) {
    // noop
  } else if (Symbol.asyncIterator in result) {
    for await (const yielded of result as AsyncIterable<T>) {
      yield transform(yielded)
    }
  } else {
    const awaited = await result

    if (awaited === undefined) {
      // noop
    } else if (Symbol.iterator in result) {
      for (const yielded of result as Iterable<T>) {
        yield transform(yielded)
      }
    }
  }
}

export async function timeout<T>(
  promise: Promise<T>,
  ms: number,
  error: ErrorBuilder<[number]> = (ms: number) => new Error(`Timeout after ${ms} ms`)
) {
  return new Promise<T>((resolve, reject) => {
    const timeoutHandle = setTimeout(
      () => {
        reject(buildError(error, ms))
      },
      ms
    )

    promise.then((v) => {
      resolve(v)
      clearTimeout(timeoutHandle)
    }).catch((e) => {
      reject(e)
    })
  })
}

export async function collectAsyncResult<T>(r: PossiblyAsyncResult<T>) {
  const output: T[] = []

  await iterateOverAsyncResult(
    r,
    t => void output.push(t),
    constFalse
  )

  return output
}
