import { declareSimpleSink } from "@/core/index.author"
import { noop } from "@/patterns/functions"
import { Sink } from "@/types/abstract"

export function forEachPrototype<T>(
  forEach: (t: T) => void | Promise<void>,
  name?: string
): Sink<T, void, any> {
  return declareSimpleSink({
    open: noop,
    close: noop,
    consumes: new Set(/** TODO */),
    name: name ?? "ForEach",
    consume: (e) => {
      if (e.type === "ADD" || e.type === "UPDATE") {
        return forEach(e.payload)
      }
    }
  })
}
