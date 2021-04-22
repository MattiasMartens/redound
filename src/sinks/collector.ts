import { declareSimpleSink } from "@/core/index.author"
import { noop } from "@/patterns/functions"
import { Sink } from "@/types/abstract"

export function eventCollectorPrototype<T>(
  name?: string
): Sink<T, T[]> {
  return declareSimpleSink({
    open: () => [] as T[],
    close: noop,
    seal: collected => collected,
    consumes: new Set(/** TODO */),
    name: name ?? "Collector",
    consume: (e, r) => {
      r.push(e)
    }
  })
}
