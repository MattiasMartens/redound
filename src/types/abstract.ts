import { PossiblyAsyncResult } from '@/patterns/async'
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

export type SourceTag = string

export type EventTag = Record<string, string> & { id: string }

export type CoreEvent<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  tag?: EventTag
  tagProvenance?: "FIRST"
}

export type Event<T> = Omit<CoreEvent<T>, "tag" | "tagProvenance">

export type MetaEvent = {
  type: "SEAL"
} | {
  type: "VOID",
  tag: EventTag,
  tagProvenance: "LAST"
}

export type BroadEvent<T> = CoreEvent<T> | MetaEvent

export type Outcome<T, Finalization> = Either<{
  error: Error,
  event: Option<CoreEvent<T>>
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

export type GenericEmitter<T, References, Finalization> = {
  emits: Set<EventSpec<T>>,
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  open: () => References,
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
  name: string
}

// Indicate that more events may still be emitted, i.e., in response to Queries.
// (The resolution of the promise of generation() always precludes events being
// emitted in any other way.)
type NotSealed = "NOT_SEALED"

export type Source<T, References, Finalization> = GenericEmitter<T, References, Finalization> & {
  graphComponentType: "Source",
  generate: (
    emit: (e: Event<T>) => void | Promise<void>,
    r: References
  ) => void | Possible<NotSealed> | Promise<void | Possible<NotSealed>>,
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
  pull: (query: Record<string, string>, r: References) => PossiblyAsyncResult<Event<T>>,
  // Experiment -- mechanism to induce an effect upstream of
  // the source, using the event paradigm. In essence, in the
  // standard track, upstream data produces events. This
  // method would allow events to produce upstream data.
  push?: (e: CoreEvent<T>) => Promise<CoreEvent<T>>
}

type DerivationRole = string
export type SourceInstanceAbbreviated<T> = SourceInstance<T, any, any>
export type SourceType = {
  numbered: GenericEmitterInstance<any, any, any>[],
  named: Map<DerivationRole, GenericEmitterInstance<any, any, any>>
}

export type DerivationEmission<T> = void | Event<T> | Promise<Event<T>> | Iterable<Event<T> | Promise<Event<T>>> | Promise<Iterable<Event<T> | Promise<Event<T>>>>

export type Derivation<DerivationSourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate, Finalization> = GenericEmitter<T, Aggregate, Finalization> & {
  graphComponentType: "Derivation",
  unroll: (aggregate: Aggregate) => DerivationEmission<T>,
  consumes: Set<EventSpec<T>>,
  consume: <K extends keyof DerivationSourceType>(
    params: {
      event: CoreEvent<PayloadTypeOf<DerivationSourceType[K]>>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown, Finalization>,
      role: K
    }
  ) => {
    aggregate: Aggregate,
    output: DerivationEmission<T>
  },
  open: () => Aggregate,
  seal: (params: { aggregate: Aggregate, remainingUnsealedSources: Set<GenericEmitterInstance<any, any, any>> }) => {
    seal: boolean,
    output: DerivationEmission<T>,
    aggregate: Aggregate
  },
  close: (m: Aggregate, o: Outcome<any, Finalization>) => void | Promise<void>
}

export type Sink<T, References, Finalization> = {
  graphComponentType: "Sink",
  consumes: Set<EventSpec<T>>,
  consume: (e: CoreEvent<T>, r: References) => void | Promise<void>,
  open: () => References,
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
  name: string
}
