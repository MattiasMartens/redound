import { Derivation, Outcome, SealEvent } from "@/types/abstract"
import { DerivationInstance, EmitterInstanceAlias, SinkInstance, SourceInstance } from "@/types/instances"
import { none, Option, some } from "fp-ts/lib/Option"
import { left, right } from "fp-ts/lib/Either"
import { makeDerivation } from "./orchestrate"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export const unaryDerivationConsumer = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => { payload: Out[], aggregate: Aggregate }) => (
  { event, aggregate }: {
    event: In,
    aggregate: Aggregate
  }
) => {
  const {
    payload,
    aggregate: newAggregate
  } = mapper(event, aggregate)

  return {
    aggregate: newAggregate,
    output: payload
  }
}

export function makeUnaryDerivation<U, T>(
  derivation: Derivation<{ main: EmitterInstanceAlias<U> }, T, any>,
  source: EmitterInstanceAlias<U>,
  params: { id?: string } = {}
): DerivationInstance<{ main: EmitterInstanceAlias<U> }, T, any> {
  return makeDerivation(derivation, { main: source }, params)
}

export function defaultControllerRescue(error: Error, event: Option<any>): Outcome<any, never> {
  return left({
    error,
    event
  })
}

export function defaultControllerSeal(
  sealEvent: SealEvent,
  domain: {
    sources: Set<SourceInstance<any, any>>,
    sinks: Set<SinkInstance<any, any>>
  }
): Option<Outcome<any, any>> {
  if (sealEvent.graphComponentType === "Sink") {
    for (const sink of domain.sinks) {
      if (sink.lifecycle.state === "ACTIVE") {
        return none
      }
    }

    // Note that under the default regime, the controller's finalization is
    // determined only by whichever Sink was the last to seal.
    // Hence, best-suited to graphs with only one Sink, or where the finalization
    // does not matter.
    return some(
      right(
        {
          finalization: sealEvent.result
        }
      )
    )
  } else {
    return none
  }
}

export const defaultControllerTaggedEvent = () => none
