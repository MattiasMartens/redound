import { declareSimpleDerivation } from "@/core/derivation";
import { lazy } from "@/patterns/functions";
import { Derivation } from "@/types/abstract";
import { Emitter } from "@/types/instances";

export const bundlerDerivation = lazy(
  () => declareSimpleDerivation<Record<string, Emitter<any>>, any, void>({
    consume({
      event
    }) {
      return {
        output: [event]
      }
    }
  })
) as <T>() => Derivation<Record<string, Emitter<T>>, T, void>

export const namedBundlerDerivation = lazy(
  () => declareSimpleDerivation<Record<string, Emitter<any>>, any, void>({
    consume({
      event,
      role
    }) {
      return {
        output: [
          { origin: role, payload: event }]
      }
    }
  })
) as <T extends Record<string, Emitter<any>>>() => Derivation<T, { payload: T extends Record<string, Emitter<infer V>> ? V : never, origin: keyof T }, void>
