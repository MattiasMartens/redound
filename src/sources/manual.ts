import { defer } from "@/patterns/async"
import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { Possible } from "@/types/patterns"
import {
  declareSimpleSource
} from "../core/source"

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

function manualAsyncGenerator<T>() {
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

export function manualSource<T>(
  params: {
    initialValue?: T,
    name?: string
  } = {}
): Source<T, { set: (t: T) => T, end: () => void }> {
  const { name = "Manual" } = params

  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    generate: () => {
      const {
        setter,
        generator,
        ender
      } = manualAsyncGenerator<T>()

      if (params.initialValue !== undefined) {
        setter(params.initialValue)
      }

      return {
        output: generator,
        references: { set: setter, end: ender }
      }
    }
  })
}
