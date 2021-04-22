import { defer } from "@/patterns/async"
import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { pipe } from "fp-ts/lib/function"
import { map, none, some, None, Some } from "fp-ts/lib/Option"
import {
  declareSimpleSource
} from "../core/source"

async function* innerManualGenerator<T>(
  nextPromise: () => Promise<T>
) {
  while (true) {
    yield nextPromise()
  }
}

function manualAsyncGenerator<T>() {
  let currentDeferredPromise = defer<T>()
  const nextPromise = () => currentDeferredPromise.promise
  const fulfillPromise = (t: T) => {
    const toResolve = currentDeferredPromise
    currentDeferredPromise = defer<T>()
    toResolve.resolve(t)
  }

  return {
    generator: innerManualGenerator(nextPromise),
    setter: fulfillPromise
  }
}

export function manualSourcePrototype<T>(
  params: {
    initialValue?: T,
    name?: string
  } = {}
): Source<T, { set: (t: T) => T; }> {
  const { name = "Manual" } = params

  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    generate: () => {
      const {
        setter,
        generator
      } = manualAsyncGenerator<T>()

      if (params.initialValue !== undefined) {
        setter(params.initialValue)
      }

      return {
        output: generator,
        references: { set: setter }
      }
    }
  })
}
