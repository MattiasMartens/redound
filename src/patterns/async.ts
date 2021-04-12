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
