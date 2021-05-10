import { noop } from "@/patterns/functions"
import { manualAsyncGenerator } from "@/patterns/generators"
import { Source } from "@/types/abstract"
import {
  declareSimpleSource
} from "../core/source"

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
