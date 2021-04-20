import { Option } from "fp-ts/lib/Option";
import { Derivation, CoreEvent, Outcome, Sink, Source } from "./abstract";
import { Clock } from '@/core/clock'
import { Backpressure } from "@/core/backpressure";

export type SealEvent = {
  graphComponentType: "Source",
  instance: SourceInstance<any, any>
} | {
  graphComponentType: "Derivation",
  instance: DerivationInstance<any, any, any>,

}

/**
 * 1. A graph component can only have one Controller.
 * 2. If a Controller manages a Source, it also manages everything downstream
 * of a Source.
 */
export type Controller<Finalization> = {
  sources: Set<SourceInstance<any, any>>,
  sinks: Set<SinkInstance<any, any> | DerivationInstance<any, any, any>>,
  seal: (
    sealEvent: SealEvent
  ) => Option<Outcome<any, Finalization>>,
  rescue: (
    error: Error,
    event: CoreEvent<any>
  ) => Option<Outcome<any, Finalization>>,
  id: string
}


export type GenericConsumerInstance<T, MemberOrReferences> = SinkInstance<T, MemberOrReferences> | DerivationInstance<any, any, MemberOrReferences>

type Finalization = any
export type SourceInstance<T, References> = {
  prototype: Source<T, References>,
  controller: Option<Controller<Finalization>>
  id: string
  clock: Clock,
  consumers: Set<GenericConsumerInstance<T, any>>,
  backpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

export type EmitterInstanceAlias<T> = SourceInstance<T, any> | DerivationInstance<any, T, any>
export type PayloadTypeOf<X> = X extends EmitterInstanceAlias<infer T> ? T : never

export type DerivationInstance<DerivationSourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate> = {
  prototype: Derivation<DerivationSourceType, T, Aggregate>,
  controller: Option<Controller<Finalization>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  sourcesByRole: DerivationSourceType,
  sealedSources: Set<GenericEmitterInstance<any, any>>,
  consumers: Set<GenericConsumerInstance<T, any>>,
  innerBackpressure: Backpressure,
  downstreamBackpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  aggregate: Option<Aggregate>
}

export type GenericEmitterInstance<T, MemberOrReferences> = SourceInstance<T, MemberOrReferences> | DerivationInstance<any, T, MemberOrReferences>

type SourceId = string
export type SinkInstance<T, References> = {
  prototype: Sink<T, References>,
  controller: Option<Controller<Finalization>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  source: GenericEmitterInstance<T, References>,
  lifecycle: { state: "ACTIVE" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}
