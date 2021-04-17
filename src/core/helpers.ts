import { CoreEvent } from "@/types/abstract"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export const unaryDerivationConsumer = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => { payload: Out, aggregate: Aggregate }) => (
  { event, aggregate }: {
    event: CoreEvent<In>,
    aggregate: Aggregate
  }
) => {
  const {
    payload,
    aggregate: newAggregate
  } = mapper(event.payload, aggregate)

  return {
    aggregate: newAggregate,
    output: {
      payload,
      eventScope: event.eventScope,
      type: event.type,
      species: event.species
    }
  }
}
