import { Derivation, Outcome, SealEvent } from "@/types/abstract"
import { DerivationInstance, Emitter, GenericEmitterInstance, PayloadTypeOf, SinkInstance, SourceInstance } from "@/types/instances"
import { none, Option, some } from "fp-ts/lib/Option"
import { Either, left, right } from "fp-ts/lib/Either"
import { makeDerivation } from "./orchestrate"
import { PossiblyAsyncResult } from "@/patterns/async"
import { Possible } from "@/types/patterns"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export function makeUnaryDerivation<U, T>(
  derivation: Derivation<{ main: Emitter<U> }, T, any>,
  source: Emitter<U>,
  params: { id?: string } = {}
): DerivationInstance<{ main: Emitter<U> }, T, any> {
  return makeDerivation(derivation, { main: source }, params)
}

export function defaultControllerRescue(error: Error, event: Option<any>) {
  return some(
    left({
      error,
      event
    })
  )
}

export function defaultControllerSeal(
  sealEvent: SealEvent,
  domain: {
    sources: Set<SourceInstance<any, any>>,
    sinks: Set<SinkInstance<any, any, any>>
  }
): Option<Outcome<any, any>> {
  if (sealEvent.graphComponentType === "Sink") {
    for (const sink of domain.sinks) {
      if (sink.lifecycle.state === "ACTIVE") {
        return none
      }
    }

    // Note that under the default regime, the controller's finalization is determined only by whichever Sink was the last to seal.
    // Hence, best-suited to graphs with only one Sink, or where the finalization does not matter.
    return some(
      right(
        sealEvent.result
      )
    )
  } else {
    return none
  }
}

export const defaultControllerTaggedEvent = () => none

export function roleConsumer<DerivationSourceType extends Record<string, Emitter<any>>, T, Aggregate>(
  consumers: { [K in keyof DerivationSourceType]: (
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      tag: Possible<string>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K,
      capabilities: {
        push: (event: any, role: string) => Either<Error, void>,
        pull: (params: { query: any, role: string, tag?: string }) => Either<Error, void>
      }
    }
  ) => {
    aggregate?: Aggregate,
    output?: PossiblyAsyncResult<T>
  }
  }): <K extends keyof DerivationSourceType>(
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      tag: Possible<string>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K,
      capabilities: {
        push: (event: any, role: string) => Either<Error, void>,
        pull: (params: { query: any, role: string, tag?: string }) => Either<Error, void>
      }
    }
  ) => {
    aggregate?: Aggregate,
    output?: PossiblyAsyncResult<T>
  } {
  return (params) => consumers[params.role](params)
}
