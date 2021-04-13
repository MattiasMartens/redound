import { Possible } from "@/types/patterns"

export function backpressure() {
  return {
    queue: [] as (() => Promise<any>)[],
    holder: undefined as Possible<Promise<any>>
  }
}
export type Backpressure = ReturnType<typeof backpressure>

function cycleBackpressure(backpressure: Backpressure) {
  if (backpressure.queue.length) {
    const promiseFn = backpressure.queue.shift()!
    backpressure.holder = promiseFn()
  } else {
    backpressure.holder = undefined
  }
}

export async function applyToBackpressure<T>(backpressure: Backpressure, fn: () => Promise<T>): Promise<T> {
  if (backpressure.holder) {
    return new Promise<T>(
      resolve => backpressure.queue.push(() => {
        const promise = fn()
        resolve(promise)

        promise.finally(
          () => cycleBackpressure(backpressure)
        )

        return promise
      })
    )
  } else {
    const promise = fn()
    backpressure.holder = promise
    promise.finally(() => cycleBackpressure(backpressure))
    const retVal = await promise
    return retVal
  }
}
