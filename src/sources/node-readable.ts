import { declareSimpleSource } from "@/core/source"
import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import {
  Readable
} from "stream"

export function nodeReadableSource<T>(
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
