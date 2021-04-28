import { makeSource } from "@/core"
import { close, declareSimpleSource, seal } from "@/core/source"
import { forEachIterable } from "@/patterns/iterables"
import { Source } from "@/types/abstract"
import { SourceInstance } from "@/types/instances"
import { right } from "fp-ts/lib/Either"

export function queryableSource<T>(
  sourceProducingFunction: (query: any) => Source<T, any> | SourceInstance<T, any> | AsyncIterable<T>,
  name?: string
) {
  const sourceInstance: Source<any, Map<string, SourceInstance<any, any>>> = declareSimpleSource(
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
          const newSource: AsyncIterable<T> = ("graphComponentType" in producedSource && producedSource.graphComponentType === "Source") ? makeSource(producedSource) : producedSource as AsyncIterable<T> | SourceInstance<T, any>
          references.set(tag, newSource)

          return right(newSource)
        }
      }
    }
  )

  return sourceInstance
}
