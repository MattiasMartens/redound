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
  ) => Option<Outcome<any, Finalization, Query>>
}

export type GenericConsumerInstance<T, Finalization, Query> = {
  consume: (e: Event<T, Query> | MetaEvent<Query>) => Promise<void>,
  close: (o: Outcome<T, Finalization, Query>) => Promise<void>,
  seal: (source: SourceInstance<any, any, any, any>) => Promise<void>,
  id: string
}

type ConsumerId = string
export type SourceInstance<T, References, Finalization, Query> = {
  clock: Clock,
  prototype: Source<T, References, Finalization, Query>,
  consumers: Set<GenericConsumerInstance<T, Finalization, Query>>,
  backpressure: Option<Promise<void>>,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>,
  id: string,
  controller: Option<Controller<Finalization, Query>>
}

export type DerivationInstance<T, Member, Finalization, Query> = {
  prototype: Derivation<T, Member, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>
}

export type SinkInstance<T, Finalization, Query, References> = {
  prototype: Sink<T, Finalization, Query, References>,
  controller: Option<Controller<Finalization, Query>>
}
