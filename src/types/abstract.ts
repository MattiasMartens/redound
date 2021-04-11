import {
  Either
} from 'fp-ts/lib/Either'
import {
  Option
} from 'fp-ts/lib/Option'
import { GenericEmitterInstance } from './instances'
import { Possible } from './patterns'

export type CoreEventType = "ADD" | "REMOVE" | "UPDATE"

export type EventScope = "VOID" | "ROOT" | "CHILD" // | "DEEP_CHILD"

// May be emitted by emitter, but not to be received by consumer
// (handled at the framework level).
export type MetaEventType = "SEAL" | "VOID"

/**
 * Vocabulary:
 * - UNROLL: a consumer catching up on events prior
 * to its initialization
 */
export type EventSpecies = string

export type EventUniqueTag = string
export type SourceTag = string

export type FinalQueryState<Query> = {
  state: "FAILED",
  error: Error,
  query: Query
} | {
  state: "SUCCESSFUL",
  finalResultantTick: number,
  query: Query
}

export type QueryState<Query> = {
  state: "WAITING",
  latestResultantTick: number,
  query: Query
} | FinalQueryState<Query>

type SourceId = string

export type Event<T, Query> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  // Number is max tick received from source that was involved in producing
  // this event.
  provenance: Map<SourceId, number>,
  cause: Set<QueryState<Query>>
}

export type MetaEvent<Query> = {
  type: MetaEventType,
  provenance: Map<SourceId, number>,
  cause: Set<QueryState<Query>>
}

export type BroadEvent<T, Query> = Event<T, Query> | MetaEvent<Query>

export type BareSourceEmitted<T> = Omit<
  Event<T, never>,
  'provenance' | 'cause'
>

export type BareDerivationEmitted<T> = Omit<
  Event<T, never>,
  'provenance' | 'cause'
> & {
  incitingEvents?: Set<Event<any, any>>
}

export type Outcome<T, Finalization, Query> = Either<{
  error: Error,
  event: Option<Event<T, Query>>
}, {
  finalization: Finalization,
  lastTick: number
}>

export type EventSpec<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T
}

export type GenericEmitter<T, References, Finalization, Query> = {
  emits: Set<EventSpec<T>>,
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  open: () => References,
  close: (r: References, o: Outcome<any, Finalization, Query>) => void | Promise<void>,
  name: string
}

// Indicate that more events may still be emitted, i.e., in response to Queries.
// (The resolution of the promise of generation() always precludes events being
// emitted in any other way.)
type NotSealed = "NOT_SEALED"

export type Source<T, References, Finalization, Query> = GenericEmitter<T, References, Finalization, Query> & {
  graphComponentType: "Source",
  generate: (
    r: References,
    emit: (e: BareSourceEmitted<T>) => void | Promise<void>
  ) => void | Possible<NotSealed> | Promise<void | Possible<NotSealed>>,
  close: (r: References, o: Outcome<any, Finalization, Query>) => void | Promise<void>,
  pull: (emit: (e: BareSourceEmitted<T>) => Promise<void>, query: Query, r: References) => void | Promise<FinalQueryState<Query>>,
  // Experiment -- mechanism to induce an effect upstream of
  // the source, using the event paradigm. In essence, in the
  // standard track, upstream data produces events. This
  // method would allow events to produce upstream data.
  push?: (e: Event<T, never>) => Promise<Event<T, never>>
}

export type Derivation<SourceType, T, Member, Finalization, Query> = GenericEmitter<T, Member, Finalization, Query> & {
  graphComponentType: "Derivation",
  unroll: (member: Member, emit: (e: BareSourceEmitted<T>) => void | Promise<void>) => Promise<void>,
  consumes: Set<EventSpec<T>>,
  consume: (
    params: {
      event: Event<SourceType, any>,
      emit: (e: BareSourceEmitted<T>) => void | Promise<void>,
      member: Member,
      source: GenericEmitterInstance<SourceType, unknown, Finalization, Query>
    }
  ) => Promise<Member>,
  open: () => Member,
  seal: (params: { member: Member, emit: (e: BareSourceEmitted<T>) => void | Promise<void>, remainingUnsealedSources: Set<GenericEmitterInstance<any, any, any, any>> }) => Promise<Possible<"SEAL">>,
  close: (m: Member, o: Outcome<any, Finalization, Query>) => Promise<void>,
  sourceCapability: Option<{
    pull: (emit: (e: BareSourceEmitted<T>) => void | Promise<void>, query: Query, r: Member) => Promise<FinalQueryState<Query>>
  }>
}

export type Sink<T, References, Finalization, Query> = {
  graphComponentType: "Sink",
  consumes: Set<EventSpec<T>>,
  consume: (e: Event<T, Query>, r: References) => void | Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<any, Finalization, Query>) => void | Promise<void>,
  name: string
}
