import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { pipe } from "fp-ts/lib/function"
import { map, none, some, None, Some } from "fp-ts/lib/Option"
import {
  declareSimpleSource
} from "../core/source"

export function manualSourcePrototype<T>(
  params: {
    initialValue?: T,
    name?: string
  } = {}
): Source<T, { get: () => None | Some<T>; set: (t: T) => T; }, any, void> {
  const { name = "Manual" } = params

  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    open: () => {
      const initialValueExists = "initialValue" in params
      let state = initialValueExists ? some<T>(params.initialValue as any) : none

      let emit: any

      return {
        get: () => state,
        set: (t: T) => {
          state = some(t)
          emit({
            type: "UPDATE",
            species: "UPDATE",
            eventScope: "ROOT",
            payload: t
          })
          return t
        },
        registerEmit: (_emit: any) => {
          emit = _emit

          pipe(
            state,
            map(
              t => emit({
                type: "ADD",
                species: "INITIAL",
                eventScope: "ROOT",
                payload: t
              })
            )
          )
        }
      }
    },
    generate(emit, references) {
      references.registerEmit(emit)
    }
  })
}
