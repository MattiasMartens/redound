import { Derivation, Outcome, SealEvent } from "@/types/abstract"
import { DerivationInstance, Emitter, SinkInstance, SourceInstance } from "@/types/instances"
import { none, Option, some } from "fp-ts/lib/Option"
import { left, right } from "fp-ts/lib/Either"
import { makeDerivation } from "./orchestrate"
import { PossiblyAsyncResult } from "@/patterns/async"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export const unaryDerivationConsumer = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => { output: PossiblyAsyncResult<Out>, aggregate: Aggregate }) => (
  { event, aggregate }: {
    event: In,
    aggregate: Aggregate
  }
) => {
  const {
    output,
    aggregate: newAggregate
  } = mapper(event, aggregate)

  return {
    aggregate: newAggregate,
    output
  }
}

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
