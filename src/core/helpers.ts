import { forEachIterable } from "@/patterns/iterables"
import { SourceEvent } from "@/types/abstract"

export const defaultDerivationSeal = (
  { remainingUnsealedSources }: { remainingUnsealedSources: Set<any> }
) => remainingUnsealedSources.size ? undefined : "SEAL"

export const unaryDerivationConsumer = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => Out) => (
  { event, emit, aggregate }: {
    event: SourceEvent<In>,
    aggregate: Aggregate,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => emit({
  payload: mapper(event.payload, aggregate),
  eventScope: event.eventScope,
  type: event.type,
  species: event.species
})

export const unaryDerivationConsumerAsync = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => Out | Promise<Out>) => async (
  { event, emit, aggregate }: {
    event: SourceEvent<In>,
    aggregate: Aggregate,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => {
  const payload = await mapper(event.payload, aggregate)

  emit({
    payload,
    eventScope: event.eventScope,
    type: event.type,
    species: event.species
  })
}

export const unaryDerivationConsumerFlatten = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => Iterable<Out>) => (
  { event, emit, aggregate }: {
    event: SourceEvent<In>,
    aggregate: Aggregate,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => forEachIterable(
  mapper(event.payload, aggregate),
  payload => emit({
    payload,
    eventScope: event.eventScope,
    type: event.type,
    species: event.species
  })
)

export const unaryDerivationConsumerFlattenAsync = <In, Out, Aggregate>(mapper: (i: In, m: Aggregate) => Promise<
  Iterable<Out | Promise<Out>>
>) => async (
  { event, emit, aggregate }: {
    event: SourceEvent<In>,
    aggregate: Aggregate,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => {
  const iterable = await mapper(event.payload, aggregate)
    for await (const payload of iterable) {
      emit({
        payload,
        eventScope: event.eventScope,
        type: event.type,
        species: event.species
      })
    }
  }
