import { Option } from "fp-ts/lib/Option"
import { Controller, Derivation, Outcome, Query, SealEvent, Sink, Source } from "./abstract"
import { Backpressure } from "@/core/backpressure"
import { Either } from "fp-ts/lib/Either"

export type GenericConsumerInstance<T, MemberOrReferences> = SinkInstance<T, MemberOrReferences, any> | DerivationInstance<any, any, MemberOrReferences>

type Finalization = any
export type SourceInstance<T, References> = {
  [Symbol.asyncIterator]: () => AsyncIterator<T>,
  id: string,
  prototype: Source<T, References>,
  controller: Option<ControllerInstance<any>>,
  consumers: Set<GenericConsumerInstance<T, any>>,
  backpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" | "ITERATING" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  // Initialized to 'Some' on first subscription event, reverted to 'None' once closed.
  references: Option<References>,
  pull?: (
    query: Query,
    tag?: string
  ) => Either<Error, Promise<void>>,
  // TODO tags here
  // TODO? should push protocol be async-iterable-based?
  push?: (
    event: any
  ) => Either<Error, Promise<void>>
}

export type Emitter<T> = SourceInstance<T, any> | DerivationInstance<any, T, any>
export type PayloadTypeOf<X> = X extends Emitter<infer T> ? T : never

type DerivationVariation<DerivationSourceType extends Record<string, Emitter<any>>, Aggregate> = {
  derivationSpecies: "Transform"
} | {
  derivationSpecies: "Relay",
  relayQueue: Promise<void>[],
  schedule: <K extends keyof DerivationSourceType>(event: PayloadTypeOf<DerivationSourceType[K]>,
    aggregate: Aggregate,
    source: GenericEmitterInstance<any, unknown>,
    role: K) => Promise<void>
}

export type DerivationInstance<DerivationSourceType extends Record<string, Emitter<any>>, T, Aggregate> = {
  prototype: Derivation<DerivationSourceType, T, Aggregate>,
  controller: Option<ControllerInstance<any>>,
  id: string,
  sourcesByRole: DerivationSourceType,
  sealedSources: Set<GenericEmitterInstance<any, any>>,
  consumers: Set<GenericConsumerInstance<T, any>>,
  backpressure: Backpressure,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  aggregate: Option<Aggregate>
} & DerivationVariation<DerivationSourceType, Aggregate>

export type UnaryDerivationInstance<T, Out> = DerivationInstance<{ main: Emitter<T> }, Out, any>

export type GenericEmitterInstance<T, MemberOrReferences> = SourceInstance<T, MemberOrReferences> | DerivationInstance<any, T, MemberOrReferences>

type SourceId = string
export type SinkInstance<T, References, SinkResult> = {
  prototype: Sink<T, References, SinkResult>,
  controller: Option<ControllerInstance<any>>,
  id: string,
  siphoning: boolean,
  latestTickByProvenance: Map<SourceId, number>,
  lifecycle: { state: "ACTIVE" } | { state: "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization> },
  seal: () => Promise<void>,
  close: (outcome: Outcome<any, any>) => Promise<void>,
  sinkResult: () => Promise<SinkResult>,
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>,
  capabilities: {
    push: (event: any, role: string) => Either<Error, void>,
    pull: (query: any, role: string) => Either<Error, void>
  }
  // TODO semantics for pull(), which dispatches the pull() call to the controller and then returns a Promise which resolves when the EndOfTagEvent corresponding to the pull() is received.
}

export type ControllerInstance<Finalization> = {
  prototype: Controller<Finalization>,
  waitForPressure: number,
  sources: Set<SourceInstance<any, any>>,
  sourcesByRole: Map<string, SourceInstance<any, any>>,
  sinks: Set<SinkInstance<any, any, any>>,
  push: (event: any, role: string) => Either<Error, Promise<void>>,
  pull: (params: {
    query: any,
    role: string,
    tag?: string
  }) => Either<Error, Promise<void>>,
  seal: (
    sealEvent: SealEvent
  ) => Promise<void>,
  rescue: (
    error: Error,
    event: Option<any>,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>
  ) => Promise<void>,
  taggedEvent: (
    event: any,
    tag: string,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>
  ) => Promise<void>,
  outcome: Option<Outcome<any, Finalization>>,
  promisedOutcome: () => Promise<Outcome<any, Finalization>>,
  // A function, intended to be generic, that the controller uses to determine that all close events have propagated fully to all sinks.
  close: (
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>
  ) => void,
  // A Promise that resolves only when all Sinks have closed.
  // WARNING: This Promise will not wait for the closing of Derivations.
  // TODO: Maybe it should?
  allSinksClosed: () => Promise<void>,
  registerSource: (
    sourceInstance: SourceInstance<any, any>,
    role?: string
  ) => void,
  capabilities: {
    push: (event: any, role: string) => Either<Error, void>,
    pull: (params: { query: any, role: string, tag: string }) => Either<Error, void>
  },
  id: string
}
