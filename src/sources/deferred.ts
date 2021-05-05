import { makeSink, makeSource } from "@/core"
import { makeAsyncIterableSink } from "@/core/orchestrate"
import { close, declareSimpleSource, seal } from "@/core/source"
import { chainAsyncResults, PossiblyAsyncResult } from "@/patterns/async"
import { pick } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { SealEvent } from "@/types/events"
import { Emitter, SourceInstance } from "@/types/instances"
import { right, left } from "fp-ts/lib/Either"
import { pipe } from "fp-ts/lib/function"
import { some } from "fp-ts/lib/Option"
import { fold, isSome, map, none, Option } from "fp-ts/lib/Option"

export function deferredSource<T>(
  sourceProducingFunction: (query: any) => Source<T, any> | SourceInstance<T, any> | AsyncIterable<T>,
  name?: string
) {
  const sourceInstance: Source<any, {
    instantiatedInnerSource: Option<AsyncIterable<T>>
  }> = declareSimpleSource(
    {
      name: name ?? "Deferred",
      emits: new Set(/** TODO */),
      close: (references, outcome) => {
        pipe(
          references,
          pick("instantiatedInnerSource"),
          map(
            (s: any) => {
              if (("prototype" in s) && ("graphComponentType" in s.prototype) && s.prototype.graphComponentType === "Source") {
                close(s, outcome)
              }
            }
          )
        )
      },
      generate: () => {
        return {
          references: {
            instantiatedInnerSource: none as Option<AsyncIterable<T>>
          }
        }
      },
      pull: (
        query,
        references
      ) => {
        return pipe(
          references.instantiatedInnerSource,
          fold(
            () => {
              const producedSource = sourceProducingFunction(query)
              const newAsyncIterable = (Symbol.iterator in producedSource || Symbol.asyncIterator in producedSource) ? producedSource as PossiblyAsyncResult<T> : makeAsyncIterableSink(
                "graphComponentType" in producedSource && producedSource.graphComponentType === "Source" ? makeSource(producedSource) : producedSource as Emitter<T>
              )

              return right(
                {
                  output: newAsyncIterable,
                  seal: true
                }
              )
            },
            () => left(new Error("Attempted to initialize inner source of deferred source after it had already been initialized"))
          )
        )
      }
    }
  )

  return sourceInstance
}