import { declareSimpleSink } from "@/core/index.author"
import { noop } from "@/patterns/functions"
import { Sink } from "@/types/abstract"

export function consoleLogSink<T>(
  name?: string
): Sink<T, void, void> {
  return declareSimpleSink({
    open: noop,
    close: noop,
    seal: noop,
    consumes: new Set(/** TODO */),
    name: name ?? "LogToConsole",
    consume: (e) => console.log(e)
  })
}
