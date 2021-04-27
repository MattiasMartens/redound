import { makeSink, makeSource } from "@/core"
import { declareSimpleSink } from "@/core/sink"
import { close, declareSimpleSource, seal } from "@/core/source"
import { chainAsyncResults } from "@/patterns/async"
import { pick } from "@/patterns/functions"
import { forEachIterable } from "@/patterns/iterables"
import { Source } from "@/types/abstract"
import { SourceInstance } from "@/types/instances"

export function queryableSource<T>(
  sourceProducingFunction: (query: any) => Source<T, any>,
  name?: string
) {
  const sourceInstance: Source<any, Map<string, SourceInstance<any, any>>> = declareSimpleSource(
    {
      name: name ?? "Queryable",
      emits: new Set(/** TODO */),
      close: (references, outcome) => {
        forEachIterable(
          references,
          ([, source]) => close(source, outcome)
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
          const newSource = makeSource(sourceProducingFunction(query))
          references.set(tag, newSource)

          const {
            output
          } = newSource.prototype.generate()

          return 0 as any
        }
      }
    }
  )

  return sourceInstance
}
