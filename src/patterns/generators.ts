import { Possible } from "@/types/patterns"
import { defer } from "./async"

async function* innerManualGenerator<T>(
  nextPromise: () => Promise<Possible<T>>
) {
  while (true) {
    const value = await nextPromise()

    if (value === undefined) {
      return
    } else {
      yield value
    }
  }
}

export function manualAsyncGenerator<T>() {
  let currentDeferredPromise = defer<Possible<T>>()
  const nextPromise = () => currentDeferredPromise.promise
  const fulfillPromise = (t: T) => {
    const toResolve = currentDeferredPromise
    currentDeferredPromise = defer<Possible<T>>()
    toResolve.resolve(t)
  }

  const ender = () => {
    const toResolve = currentDeferredPromise
    currentDeferredPromise = undefined as any
    toResolve.resolve(undefined)
  }

  return {
    generator: innerManualGenerator(nextPromise),
    setter: fulfillPromise,
    ender
  }
}
