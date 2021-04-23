import { declareSimpleSource } from "@/core/source"
import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import {
  Readable
} from "stream"

// TODO Mystery here: Readable seems to work just like async generator
// but isn't assignable or even lightly castable to it. This function
// may be needed to explicitly convert.
async function* generateFromStream(r: Readable) {
  for await (const x of r) {
    yield x
  }
}

export function nodeReadableSourcePrototype<T>(
  stream: Readable,
  {
    name = "NodeReadable"
  }: {
    name?: string
  } = {}
): Source<T, {
  stream: Readable,
  closeListener: () => void,
}> {
  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    generate() {
      return {
        output: stream as any as AsyncGenerator<any>
      }
    }
  })
}
