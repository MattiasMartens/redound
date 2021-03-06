import { makeSource } from "@/core"
import { makeAsyncIterableSink } from "@/core/orchestrate"
import { close, declareSimpleSource, seal } from "@/core/source"
import { forEachIterable } from "@/patterns/iterables"
import { Derivation, Source } from "@/types/abstract"
import { Emitter, SourceInstance } from "@/types/instances"
import { right } from "fp-ts/lib/Either"

export function queryableSource<T>(
  sourceProducingFunction: (query: any) => Source<T, any> | Derivation<any, T, any> | Emitter<T> | AsyncIterable<T> | Iterable<T>,
  name?: string
) {
  const sourceInstance: Source<T, Map<string, SourceInstance<any, any>>> = declareSimpleSource(
    {
      name: name ?? "Queryable",
      emits: new Set(/** TODO */),
      close: (references, outcome) => {
        forEachIterable(
          references,
          ([, source]: [any, any]) => {
            if (("prototype" in source) && ("graphComponentType" in source.prototype) && source.prototype.graphComponentType === "Source") {
              close(source, outcome)
            }
          }
        )
      },
      generate: () => {
        return {
          references: new Map()
        }
      },
      pull: (
        query,
        references,
        tag
      ) => {
        if (references.has(tag)) {
          throw new Error(`A query tagged ${tag} was already registered`)
        } else {
          const producedSource = sourceProducingFunction(query)
          const newAsyncIterable = Symbol.asyncIterator in producedSource ? producedSource as AsyncIterable<T> : Symbol.iterator in producedSource ? producedSource as Iterable<T> : makeAsyncIterableSink(
            "graphComponentType" in producedSource && producedSource.graphComponentType === "Source" ? makeSource(producedSource) : producedSource as Emitter<T>
          )

          return right(newAsyncIterable)
        }
      }
    }
  )

  return sourceInstance
}
