import { declareSimpleSink } from "@/core/index.author"
import { noop } from "@/patterns/functions"
import { Sink } from "@/types/abstract"

function mySecondOrderFn(firstOrderFn: () => Promise<void>) {
  return async () => {
    console.log("Calling firstOrderFn()")
    const output = await firstOrderFn()
    console.log("Finished calling firstOrderFn()")
  }
}

export function forEachSink<T>(
  forEach: (t: T) => void | Promise<void>,
  name?: string
): Sink<T, void, void> {
  return declareSimpleSink({
    open: noop,
    close: noop,
    seal: noop,
    consumes: new Set(/** TODO */),
    name: name ?? "ForEach",
    consume: async ({ event }) => {
      return void await forEach(event)
    }
  })
}
