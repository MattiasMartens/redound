import { forEachIterable } from "@/patterns/iterables"
import { SourceEvent } from "@/types/abstract"

export const defaultDerivationSeal = (
  { remainingUnsealedSources }: { remainingUnsealedSources: Set<any> }
) => remainingUnsealedSources.size ? undefined : "SEAL"

export const unaryDerivationConsumer = <In, Out, Member>(mapper: (i: In, m: Member) => Out) => (
  { event, emit, member }: {
    event: SourceEvent<In>,
    member: Member,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => emit({
  payload: mapper(event.payload, member),
  eventScope: event.eventScope,
  type: event.type,
  species: event.species
})

export const unaryDerivationConsumerAsync = <In, Out, Member>(mapper: (i: In, m: Member) => Out | Promise<Out>) => async (
  { event, emit, member }: {
    event: SourceEvent<In>,
    member: Member,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => {
  const payload = await mapper(event.payload, member)

  emit({
    payload,
    eventScope: event.eventScope,
    type: event.type,
    species: event.species
  })
}

export const unaryDerivationConsumerFlatten = <In, Out, Member>(mapper: (i: In, m: Member) => Iterable<Out>) => (
  { event, emit, member }: {
    event: SourceEvent<In>,
    member: Member,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => forEachIterable(
  mapper(event.payload, member),
  payload => emit({
    payload,
    eventScope: event.eventScope,
    type: event.type,
    species: event.species
  })
)

export const unaryDerivationConsumerFlattenAsync = <In, Out, Member>(mapper: (i: In, m: Member) => Promise<
  Iterable<Out | Promise<Out>>
>) => async (
  { event, emit, member }: {
    event: SourceEvent<In>,
    member: Member,
    emit: (e: SourceEvent<Out>) => void | Promise<void>,
  }
) => {
    const iterable = await mapper(event.payload, member)
    for await (const payload of iterable) {
      emit({
        payload,
        eventScope: event.eventScope,
        type: event.type,
        species: event.species
      })
    }
  }
