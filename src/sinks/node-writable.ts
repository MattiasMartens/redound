import { declareSimpleSink } from "@/core/index.author"
import { noop } from "@/patterns/functions"
import { Sink } from "@/types/abstract"
import { Writable } from "stream"

export function nodeWritableSink<T>(
  writable: Writable,
  name?: string
): Sink<T, Writable, void> {
  return declareSimpleSink<T, Writable, void>({
    open: () => writable,
    // TODO closing on seal means that any event emissions caused by pull()
    // might cause an error on this sink; however this depends on the semantics
    // around seal and pull which are not yet fleshed out
    seal: (w) => {
      w.end()
    },
    close: noop,
    consumes: new Set(/** TODO */),
    name: name ?? "ForEach",
    consume: (e, w) => {
      w.write(e)
    }
  })
}
