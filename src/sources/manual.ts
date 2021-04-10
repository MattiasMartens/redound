import { noop } from "@/patterns/functions"
import { Source } from "@/types/abstract"
import { pipe } from "fp-ts/lib/function"
import { map, none, some, Option } from "fp-ts/lib/Option"
import {
  declareSimpleSource
} from "../core/source"

export function manualSourcePrototype<T>(
  params: {
    initialValue?: T,
    name?: string
  }
): Source<T, void, any, void> {
  const { name = "Manual" } = params

  let get: () => Option<T>
  let set: (newValue: T) => T

  return declareSimpleSource({
    close: noop,
    name,
    emits: new Set(/** TODO */),
    open: (emit) => {
      const initialValueExists = "initialValue" in params
      let state = initialValueExists ? some<T>(params.initialValue as any) : none


      pipe(
        state,
        map(
          payload => emit({
            type: "ADD",
            species: "INITIAL",
            eventScope: "ROOT",
            payload: params.initialValue as any as T
          })
        )
      )

      get = () => state
      set = (t: T) => {
        state = some(t)
        emit({
          type: "UPDATE",
          species: "UPDATE",
          eventScope: "ROOT",
          payload: params.initialValue as any as T
        })
        return t
      }
    }
  })
}
