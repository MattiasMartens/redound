import { close, declareSimpleSource } from "@/core/source";
import { pick } from "@/patterns/functions";
import { SourceInstance } from "@/types/instances";
import { right, left } from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import { some } from "fp-ts/lib/Option";
import { fold, isSome, map, none, Option } from "fp-ts/lib/Option";

export function deferredSource(
  sourceProducingFunction: (query: any) => SourceInstance<any, any>,
  name?: string
) {
  return declareSimpleSource(
    {
      name: name ?? "Deferred",
      emits: new Set(/** TODO */),
      close: (references, outcome) => {
        pipe(
          references,
          pick("instantiatedInnerSource"),
          map(
            s => close(s, outcome)
          )
        )
      },
      generate: () => {
        return {
          references: {
            instantiatedInnerSource: none as Option<SourceInstance<any, any>>
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
              const newSource = sourceProducingFunction(query)
              references.instantiatedInnerSource = some(newSource)

              const {
                output
              } = newSource.prototype.generate()

              // TODO The deferred source should seal itself when the inner source seals. This could be done with an inner sink that just waits for the seal control event.

              return right(output)
            },
            () => left(new Error("Attempted to initialize inner source of deferred source after it had already been initialized"))
          )
        )
      }
    }
  )
}