import { Possible } from "@/types/patterns"

export function backpressure() {
  return {
    queue: [] as (() => Promise<any>)[],
    holder: undefined as Possible<Promise<any>>
  }
}
export type Backpressure = ReturnType<typeof backpressure>

export async function applyToBackpressure<T>(fn: () => Promise<T>, backpressure: Backpressure) {
  if (backpressure.holder) {
    return new Promise<any>(
      resolve => backpressure.queue.push(() => {
        const promise = fn()
        resolve(promise)

        promise.finally(() => {
          if (backpressure.queue.length) {
            const promiseFn = backpressure.queue.pop()!
            backpressure.holder = promiseFn()
          } else {
            backpressure.holder = undefined
          }
        })

        return promise
      })
    )
  } else {
    const promise = fn()
    backpressure.holder = promise
    const retVal = await promise
    return retVal
  }
}
