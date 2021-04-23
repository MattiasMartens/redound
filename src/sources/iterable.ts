import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { PossiblyAsyncResult } from "@/patterns/async"
import {
  declareSimpleSource
} from "../core/source"

// TODO This could have a faculty to make it interruptible on close(),
// Or to yield control to the event loop periodically. At the moment this
// is a simple, uninterruptible, blocking generation.
export function iterableSourcePrototype<T>(
  iterable: PossiblyAsyncResult<T>,
  {
    name = "Iterable"
  }: {
    name?: string
  } = {}
): Source<T, void> {
  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    generate() {
      return {
        output: iterable
      }
    }
  })
}

export function tupleFirst<T>(tuple: [T, any]) {
  return tuple[0]
}
