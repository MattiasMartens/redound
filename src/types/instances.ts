import { Option } from "fp-ts/lib/Option"
import { Controller, CoreEvent, Derivation, Outcome, SealEvent, Sink, Source } from "./abstract"
import { Backpressure } from "@/core/backpressure"

export type GenericConsumerInstance<T, MemberOrReferences> = SinkInstance<T, MemberOrReferences> | DerivationInstance<any, any, MemberOrReferences>

type Finalization = any
export type SourceInstance<T, References> = {
  prototype: Source<T, References>,
  controller: Option<ControllerInstance<any>>,
  id: string,
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
  controller: Option<ControllerInstance<any>>,
  id: string,
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
  controller: Option<ControllerInstance<any>>,
  id: string,
  latestTickByProvenance: Map<SourceId, number>,
  source: GenericEmitterInstance<T, References>,
  lifecycle: { state: "ACTIVE" } | { state: "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>
}

export type ControllerInstance<Finalization> = {
  sources: Set<SourceInstance<any, any>>,
  sinks: Set<SinkInstance<any, any>>,
  seal: (
    sealEvent: SealEvent
  ) => Promise<void>,
  rescue: (
    error: Error,
    event: Option<CoreEvent<any>>,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any>
  ) => Promise<void>,
  taggedEvent: (
    event: CoreEvent<any>,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any>
  ) => Promise<void>,
  outcome: Option<Outcome<any, Finalization>>,
  awaitOutcome: () => Promise<Outcome<any, Finalization>>,
  registerSource: (
    sourceInstance: SourceInstance<any, any>
  ) => void,
  id: string
}
