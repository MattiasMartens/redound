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

export type GenericConsumerInstance<T, MemberOrReferences, Finalization, Query> = SinkInstance<T, MemberOrReferences, Finalization, Query> | DerivationInstance<T, MemberOrReferences, Finalization, Query>

export type SourceInstance<T, References, Finalization, Query> = {
  prototype: Source<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>
  id: string
  clock: Clock,
  consumers: Set<GenericConsumerInstance<T, any, Finalization, Query>>,
  backpressure: Option<Promise<void>>,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

type DerivationRole = string
export type DerivationInstance<T, Member, Finalization, Query> = {
  prototype: Derivation<T, Member, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  sourcesByRole: {
    indistinct: Set<SourceId>,
    named: Map<DerivationRole, SourceId>
  },
  consumers: Set<GenericConsumerInstance<T, any, Finalization, Query>>,
  backpressure: Option<Promise<void>>,
  lifecycle: { state: "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  member: Member
}

type SourceId = string
export type SinkInstance<T, References, Finalization, Query> = {
  prototype: Sink<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  source: SourceInstance<T, References, Finalization, Query>,
  lifecycle: { state: "ACTIVE" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}
