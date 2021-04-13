import { noop } from "@/patterns/functions"
import { forEachIterable } from "@/patterns/iterables"
import { Source } from "@/types/abstract"
import {
  declareSimpleSource
} from "../core/source"

// TODO This could have a faculty to make it interruptible on close(),
// Or to yield control to the event loop periodically. At the moment this
// is a simple, uninterruptible, blocking generation.
export function iterableSourcePrototype<T>(
  iterable: Iterable<T>,
  {
    name = "Iterable"
  }: {
    name?: string
  } = {}
): Source<T, void, any> {
  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    open: noop,
    generate(emit) {
      forEachIterable(
        iterable,
        payload => emit({
          payload,
          eventScope: "ROOT",
          type: "ADD",
          species: "ADD"
        })
      )
    }
  })
}

export function asyncIterableSourcePrototype<T>(
  iterable: Iterable<Promise<T>>,
  {
    name = "Iterable"
  }: {
    name?: string
  } = {}
): Source<T, void, any> {
  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    open: noop,
    async generate(emit) {
      for await (const payload of iterable) {
        emit({
          payload,
          eventScope: "ROOT",
          type: "ADD",
          species: "ADD"
        })
      }
    }
  })
}
