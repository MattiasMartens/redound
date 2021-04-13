import { Option } from "fp-ts/lib/Option";
import { Derivation, CoreEvent, Outcome, Sink, Source } from "./abstract";
import { Clock } from '@/core/clock'
import { Backpressure } from "@/core/backpressure";

/**
 * 1. A graph component can only have one Controller.
 * 2. If a Controller manages a Source, it also manages everything downstream
 * of a Source.
 */
export type Controller<Finalization> = {
  sources: Set<SourceInstance<any, any, Finalization>>,
  sinks: Set<SinkInstance<any, any, Finalization> | DerivationInstance<any, any, any, Finalization>>,
  seal: (source: SourceInstance<any, any, Finalization>) => Option<Outcome<any, Finalization>>,
  rescue: (
    error: Error,
    event: CoreEvent<any>
  ) => Option<Outcome<any, Finalization>>,
  id: string
}

export type GenericConsumerInstance<T, MemberOrReferences, Finalization> = SinkInstance<T, MemberOrReferences, Finalization> | DerivationInstance<any, any, MemberOrReferences, Finalization>

export type SourceInstance<T, References, Finalization> = {
  prototype: Source<T, References, Finalization>,
  controller: Option<Controller<Finalization>>
  id: string
  clock: Clock,
  consumers: Set<GenericConsumerInstance<T, any, Finalization>>,
  backpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

export type EmitterInstanceAlias<T> = SourceInstance<T, any, any> | DerivationInstance<any, T, any, any>
export type PayloadTypeOf<X> = X extends EmitterInstanceAlias<infer T> ? T : never

export type DerivationInstance<DerivationSourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate, Finalization> = {
  prototype: Derivation<DerivationSourceType, T, Aggregate, Finalization>,
  controller: Option<Controller<Finalization>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  sourcesByRole: DerivationSourceType,
  sealedSources: Set<GenericEmitterInstance<any, any, any>>,
  consumers: Set<GenericConsumerInstance<T, any, Finalization>>,
  innerBackpressure: Backpressure,
  downstreamBackpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  aggregate: Option<Aggregate>
}

export type GenericEmitterInstance<T, MemberOrReferences, Finalization> = SourceInstance<T, MemberOrReferences, Finalization> | DerivationInstance<any, T, MemberOrReferences, Finalization>

type SourceId = string
export type SinkInstance<T, References, Finalization> = {
  prototype: Sink<T, References, Finalization>,
  controller: Option<Controller<Finalization>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  source: GenericEmitterInstance<T, References, Finalization>,
  lifecycle: { state: "ACTIVE" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}
