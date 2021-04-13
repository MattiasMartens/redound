import { CoreEvent } from "@/types/abstract"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export const unaryDerivationConsumer = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => Out) => (
  { event, aggregate }: {
    event: CoreEvent<In>,
    aggregate: Aggregate
  }
) => ({
  aggregate,
  output: {
    payload: mapper(event.payload, aggregate),
    eventScope: event.eventScope,
    type: event.type,
    species: event.species
  }
})
