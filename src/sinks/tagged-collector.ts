import { declareSimpleSink } from "@/core/sink"
import { noop } from "@/patterns/functions"
import { Possible } from "@/types/patterns"
import { getOrFill } from "big-m"

export function taggedCollectorSink<T>(
  name?: string
) {
  return declareSimpleSink<T, Map<string | null, T[]>, Map<string | null, T[]>>({
    open: () => new Map() as Map<string | null, T[]>,
    close: noop,
    seal: collected => collected,
    consumes: new Set(/** TODO */),
    name: name ?? 'TaggedCollector',
    consume: ({ event, tag, references }) => {
      const arr = getOrFill(
        references,
        tag === undefined ? null : tag,
        () => []
      )

      return void arr.push(event)
    }
  })
}
