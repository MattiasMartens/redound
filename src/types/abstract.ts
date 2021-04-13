import {
  Either
} from 'fp-ts/lib/Either'
import {
  Option
} from 'fp-ts/lib/Option'
import { GenericEmitterInstance, PayloadTypeOf, SourceInstance, EmitterInstanceAlias } from './instances'
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

export type CoreEvent<T, Query> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  // Number is max tick received from source that was involved in producing
  // this event.
  provenance: Map<SourceId, number>,
  // Indicates, given the specified provenance, which
  // upstreams have yielded their last event derived from
  // the respective Source tick.
  lastOfProvenance: Set<SourceId>,
  cause: Set<QueryState<Query>>
}

export type MetaEvent<Query> = {
  type: MetaEventType,
  provenance: Map<SourceId, number>,
  cause: Set<QueryState<Query>>
}

export type BroadEvent<T, Query> = CoreEvent<T, Query> | MetaEvent<Query>

export type SourceEvent<T> = Omit<
  CoreEvent<T, never>,
  'provenance' | 'cause' | 'lastOfProvenance'
>

export type DerivationEvent<T> = Omit<
  CoreEvent<T, never>,
  'provenance' | 'cause'
> & {
  incitingEvents?: Set<CoreEvent<any, any>>,
  lastOfProvenance?: Set<string>
}

export type Outcome<T, Finalization, Query> = Either<{
  error: Error,
  event: Option<CoreEvent<T, Query>>
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
    emit: (e: SourceEvent<T>) => void | Promise<void>,
    r: References
  ) => void | Possible<NotSealed> | Promise<void | Possible<NotSealed>>,
  close: (r: References, o: Outcome<any, Finalization, Query>) => void | Promise<void>,
  pull: (emit: (e: SourceEvent<T>) => Promise<void>, query: Query, r: References) => void | Promise<FinalQueryState<Query>>,
  // Experiment -- mechanism to induce an effect upstream of
  // the source, using the event paradigm. In essence, in the
  // standard track, upstream data produces events. This
  // method would allow events to produce upstream data.
  push?: (e: CoreEvent<T, never>) => Promise<CoreEvent<T, never>>
}

type DerivationRole = string
export type SourceInstanceAbbreviated<T> = SourceInstance<T, any, any, any>
export type SourceType = {
  numbered: GenericEmitterInstance<any, any, any, any>[],
  named: Map<DerivationRole, GenericEmitterInstance<any, any, any, any>>
}

export type DerivationEmission<T> = void | DerivationEvent<T> | Promise<DerivationEvent<T>> | Iterable<DerivationEvent<T> | Promise<DerivationEvent<T>>> | Promise<Iterable<DerivationEvent<T> | Promise<DerivationEvent<T>>>>

export type Derivation<DerivationSourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate, Finalization, Query> = GenericEmitter<T, Aggregate, Finalization, Query> & {
  graphComponentType: "Derivation",
  unroll: (aggregate: Aggregate) => DerivationEmission<T>,
  consumes: Set<EventSpec<T>>,
  consume: <K extends keyof DerivationSourceType>(
    params: {
      event: CoreEvent<PayloadTypeOf<DerivationSourceType[K]>, any>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown, Finalization, Query>,
      role: K
    }
  ) => {
    aggregate: Aggregate,
    output: DerivationEmission<T>
  },
  open: () => Aggregate,
  seal: (params: { aggregate: Aggregate, remainingUnsealedSources: Set<GenericEmitterInstance<any, any, any, any>> }) => {
    seal: boolean,
    output: DerivationEmission<T>,
    aggregate: Aggregate
  },
  close: (m: Aggregate, o: Outcome<any, Finalization, Query>) => void | Promise<void>
}

export type Sink<T, References, Finalization, Query> = {
  graphComponentType: "Sink",
  consumes: Set<EventSpec<T>>,
  consume: (e: CoreEvent<T, Query>, r: References) => void | Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<any, Finalization, Query>) => void | Promise<void>,
  name: string
}
