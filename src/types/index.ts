import {
  Either
} from 'fp-ts/lib/Either'
import {
  Option
} from 'fp-ts/lib/Option'

export type CoreEventType = "ADD" | "REMOVE" | "UPDATE"

export type EventScope = "VOID" | "ROOT" | "CHILD" // | "DEEP_CHILD"

/**
 * Vocabulary:
 * - UNROLL: a consumer catching up on events prior
 * to its initialization
 */
export type EventSpecies = string

export type EventUniqueTag = string
export type SourceTag = string

export type Event<T, Query> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  eventUniqueTag: string,
  eventUniqueCompositeTags: Map<SourceTag, Set<EventUniqueTag>>,
  clockStamp: number,
  cause: Option<Query>
}

export type Outcome<T, Finalization, Query> = Either<{
  error: Error,
  event: Option<Event<T, Query>>
}, Finalization>

type References = any

export type EventSpec<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T
}

export type GenericEmitter<T, Finalization, Query> = {
  emits: Set<EventSpec<T>>,
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  open: (emit: (e: Event<T, never>) => Promise<void>) => References,
  close: (r: References, o: Outcome<T, Finalization, Query>) => Promise<void>,
  name: string
}

export type Source<T, Finalization, Query> = GenericEmitter<T, Finalization, Query> & {
  close: (r: References, o: Outcome<T, Finalization, Query>) => Promise<void>,
  pull: (emit: (e: Event<T, Query>) => Promise<void>, query: Query, r: References) => void
}

type Member = any

export type Derivation<T, Finalization, Query> = GenericEmitter<T, Finalization, Query> & {
  dependencies: Set<Source<any, any, any>>,
  member: Member,
  unroll: (member: Member, emit: (e: Event<T, never>) => Promise<void>) => Promise<void>,
  consumes: Set<EventSpec<T>>,
  consume: <SourceType>(e: Event<SourceType, any>, emit: (e: Event<T, Query>) => Promise<void>, s: Source<SourceType, Finalization, Query>) => Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<T, Finalization, Query>) => Promise<void>
}

export type Sink<T, Finalization, Query> = {
  consumes: Set<EventSpec<T>>,
  consume: (e: Event<T, Query>) => Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<T, Finalization, Query>) => Promise<void>,
  name: string
}
