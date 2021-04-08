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

export type GenericEmitter<T> = {
  consumers: Set<Sink<T>>,
  emits: Set<EventSpec<T>>,
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  open: (emit: (e: Event<T, never>) => Promise<void>) => References,
  close: (r: References, o: Outcome<T, any, any>) => Promise<void>
}

type Query = any

export type Source<T, Query> = GenericEmitter<T> & {
  close: (r: References, o: Outcome<T, any, Query>) => Promise<void>,
  pull: (emit: (e: Event<T, Query>) => Promise<void>, query: Query, r: References) => void,
  tag: SourceTag
}

type Member = any

export type Derivation<T> = GenericEmitter<T> & {
  dependencies: Set<Source<any, any>>,
  member: Member,
  unroll: (member: Member, emit: (e: Event<T, never>) => Promise<void>) => Promise<void>,
  consumes: Set<EventSpec<T>>,
  consume: <SourceType>(e: Event<SourceType, any>, emit: (e: Event<T, any>) => Promise<void>, s: Source<SourceType, any>) => Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<T, any, any>) => Promise<void>
}

export type Sink<T> = {
  source: Source<T, any>,
  consumes: Set<EventSpec<T>>,
  consume: (e: Event<T, any>) => Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<T, any, any>) => Promise<void>
}
