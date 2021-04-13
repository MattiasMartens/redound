import { Option } from "fp-ts/lib/Option";
import { Derivation, CoreEvent, Outcome, Sink, Source } from "./abstract";
import { Clock } from '@/core/clock'
import { Backpressure } from "@/core/backpressure";

/**
 * 1. A graph component can only have one Controller.
 * 2. If a Controller manages a Source, it also manages everything downstream
 * of a Source.
 */
export type Controller<Finalization, Query> = {
  sources: Set<SourceInstance<any, any, Finalization, Query>>,
  sinks: Set<SinkInstance<any, any, Finalization, Query> | DerivationInstance<any, any, any, Finalization, Query>>,
  seal: (source: SourceInstance<any, any, Finalization, Query>) => Option<Outcome<any, Finalization, Query>>,
  rescue: (
    error: Error,
    event: CoreEvent<any, Query>
  ) => Option<Outcome<any, Finalization, Query>>,
  id: string
}

export type GenericConsumerInstance<T, MemberOrReferences, Finalization, Query> = SinkInstance<T, MemberOrReferences, Finalization, Query> | DerivationInstance<any, any, MemberOrReferences, Finalization, Query>

export type SourceInstance<T, References, Finalization, Query> = {
  prototype: Source<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>
  id: string
  clock: Clock,
  consumers: Set<GenericConsumerInstance<T, any, Finalization, Query>>,
  backpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

export type EmitterInstanceAlias<T> = SourceInstance<T, any, any, any> | DerivationInstance<any, T, any, any, any>
export type PayloadTypeOf<X> = X extends EmitterInstanceAlias<infer T> ? T : never

export type DerivationInstance<DerivationSourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate, Finalization, Query> = {
  prototype: Derivation<DerivationSourceType, T, Aggregate, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  sourcesByRole: DerivationSourceType,
  sealedSources: Set<GenericEmitterInstance<any, any, any, any>>,
  consumers: Set<GenericConsumerInstance<T, any, Finalization, Query>>,
  innerBackpressure: Backpressure,
  downstreamBackpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  aggregate: Option<Aggregate>
}

export type GenericEmitterInstance<T, MemberOrReferences, Finalization, Query> = SourceInstance<T, MemberOrReferences, Finalization, Query> | DerivationInstance<any, T, MemberOrReferences, Finalization, Query>

type SourceId = string
export type SinkInstance<T, References, Finalization, Query> = {
  prototype: Sink<T, References, Finalization, Query>,
  controller: Option<Controller<Finalization, Query>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  source: GenericEmitterInstance<T, References, Finalization, Query>,
  lifecycle: { state: "ACTIVE" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}
