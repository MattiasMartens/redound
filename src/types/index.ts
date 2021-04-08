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

export type Event<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  eventUniqueTag: string,
  eventUniqueCompositeTags: Map<SourceTag, Set<EventUniqueTag>>,
  clockStamp: number
}

type Either<L, R> = {
  _tag: "Left",
  left: L
} | {
  _tag: "Right",
  right: R
}

type Option<T> = {
  _tag: "None"
} | {
  _tag: "Some",
  value: T
}

type Finalization = any

export type Outcome<T> = Either<{
  error: Error,
  event: Option<Event<T>>
}, Finalization>

type References = any

export type EventSpec<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T
}

export type GenericEmitter<T> = {
  consumers: {}[],
  emits: Set<EventSpec<T>>,
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  open: (emit: (e: Event<T>) => Promise<void>) => References,
  close: (r: References, o: Outcome<T>) => Promise<void>
}

type Query = any

export type Source<T> = GenericEmitter<T> & {
  pull: (emit: (e: Event<T>) => Promise<void>, query: Query, r: References) => void,
  tag: SourceTag
}

type Member = any

export type Derivation<T> = GenericEmitter<T> & {
  dependencies: Set<Source<any>>,
  member: Member,
  unroll: (member: Member, emit: (e: Event<T>) => Promise<void>) => Promise<void>
}

export type Sink<T> = {
  source: Source<T>,
  consumes: Set<EventSpec<T>>,
  consume: (e: Event<T>) => Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<T>) => Promise<void>
}
