import { Option } from "fp-ts/lib/Option";
import { Derivation, Event, MetaEvent, Outcome, Sink, Source } from "./abstract";
import { Clock } from '@/core/clock'

/**
 * 1. A graph component can only have one Controller.
 * 2. If a Controller manages a Source, it also manages everything downstream
 * of a Source.
 */
export type Controller<Finalization, Query> = {
  sources: Set<SourceInstance<any, any, Finalization, Query>>,
  sinks: Set<SinkInstance<any, any, Finalization, Query> | DerivationInstance<any, any, Finalization, Query>>,
  seal: (source: SourceInstance<any, any, Finalization, Query>) => Option<Outcome<any, Finalization, Query>>,
  rescue: (
    error: Error,
    event: Event<any, Query>
  ) => Option<Outcome<any, Finalization, Query>>,
  id: string
}

export type GenericConsumerInstance<References, Finalization, Query> = {
  controller: Option<Controller<Finalization, Query>>,
  consumers?: Set<GenericConsumerInstance<any, Finalization, Query>>,
  id: string
}

export type SourceInstance<T, References, Finalization, Query> = {
  prototype: Source<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>
  id: string
  clock: Clock,
  consumers: Set<GenericConsumerInstance<T, Finalization, Query>>,
  backpressure: Option<Promise<void>>,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

export type DerivationInstance<T, Member, Finalization, Query> = {
  prototype: Derivation<T, Member, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>
}

type SourceId = string
export type SinkInstance<T, References, Finalization, Query> = {
  prototype: Sink<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>,
  id: string
  latestTickByProvenance: Map<SourceId, number>
  source: SourceInstance<T, References, Finalization, Query>,
  backpressure: Option<Promise<void>>,
  lifecycle: { state: "ACTIVE" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  references: Option<References>
}
