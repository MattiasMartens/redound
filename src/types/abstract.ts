import { PossiblyAsyncResult } from '@/patterns/async'
import {
  Either
} from 'fp-ts/lib/Either'
import {
  Option
} from 'fp-ts/lib/Option'
import { GenericEmitterInstance, PayloadTypeOf, SourceInstance, Emitter, SinkInstance, DerivationInstance } from './instances'
import { Possible } from './patterns'

export type Outcome = Option<{
  error: Error,
  event: Option<any>,
  componentId: string,
  componentName: string,
  componentGraphType: string
}>

export type GenericEmitter<References> = {
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  emits: Set<any>,
  close: (r: References, o: Outcome) => void | Promise<void>,
  name: string
}

export type PullEffect<T> = {
  tag: "pull",
  component: string,
  query: T,
  eventTag?: string,
  extendOperation?: boolean
}

export type PushEffect<T> = {
  tag: "push",
  component: string,
  events: PossiblyAsyncResult<T>,
  eventTag?: string,
  extendOperation?: boolean
}

export type GraphEffect<Pull, Push> = PullEffect<Pull> | PushEffect<Push>

// TODO Finalize query semantics
export type Query = any

export type Source<T, References> = GenericEmitter<References> & {
  graphComponentType: "Source",
  generate: () => {
    // Can be omitted only if the type of References is `void`
    // TODO? enforce this in the type system
    references?: References,
    output?: PossiblyAsyncResult<T>
  },
  close: (r: References, o: Outcome) => void | Promise<void>,
  pull?: (query: Query, r: References, tag: string) => Either<
    Error,
    PossiblyAsyncResult<T> | {
      output?: PossiblyAsyncResult<T>,
      seal?: boolean | (() => boolean)
    }
  >,
  // Experiment -- mechanism to induce an effect upstream of
  // the source, using the event paradigm. In essence, in the
  // standard track, upstream data produces events. This
  // method would allow events to produce upstream data.
  push?: (e: PossiblyAsyncResult<T>, tag: string) => Either<Error, PossiblyAsyncResult<T>>,
  // A Source can Push anything it can Emit by definition, but it might also want to Push things it can't emit (e.g., a Data Access Object without an ID).
  pushes?: Set<any>
}

type DerivationRole = string
export type SourceInstanceAbbreviated<T> = SourceInstance<T, any>
export type SourceType = {
  numbered: GenericEmitterInstance<any, any>[],
  named: Map<DerivationRole, GenericEmitterInstance<any, any>>
}

export type Derivation<DerivationSourceType extends Record<string, Emitter<any>>, T, Aggregate> = GenericEmitter<Aggregate> & {
  graphComponentType: "Derivation",
  derivationSpecies: "Relay" | "Transform",
  // TODO Handle push-pull capability on Derivations
  // TODO define consumes/emits protocol
  consumes: {
    [k in keyof DerivationSourceType]: Set<any>
  },
  emits: Set<any>,
  consume: <K extends keyof DerivationSourceType>(
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      tag: Possible<string>,
      extendedTag: Possible<string>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K,
    }
  ) => {
    aggregate?: Aggregate,
    output?: PossiblyAsyncResult<T>,
    effects?: GraphEffect<any, any>[]
  },
  open: () => Aggregate,
  seal: (params: {
    aggregate: Aggregate,
    source: Emitter<any>,
    role: keyof DerivationSourceType,
    remainingUnsealedSources: Set<GenericEmitterInstance<any, any>>,
    remainingUnsealedTags: Set<string>
  }) => {
    seal?: boolean | (() => boolean),
    output?: PossiblyAsyncResult<T>,
    aggregate?: Aggregate
  },
  tagSeal: (params: {
    aggregate: Aggregate,
    source: Emitter<any>,
    tag: string,
    extendedTag: Possible<string>,
    role: keyof DerivationSourceType,
    remainingUnsealedSources: Set<GenericEmitterInstance<any, any>>,
    remainingUnsealedTags: Set<string>
  }) => {
    seal?: boolean | (() => boolean),
    output?: PossiblyAsyncResult<T>,
    aggregate?: Aggregate
  },
  close: (m: Aggregate, o: Outcome) => void | Promise<void>
}

type Finalization = any
export type Sink<T, References, SinkResult> = {
  graphComponentType: "Sink",
  // TODO Define consumes/emits protocol
  consumes: Set<any>,
  consume: (params: {
    event: T,
    references: References,
    tag: Possible<string>
    // TODO Could emit processable graph effects
  }) => undefined | Promise<undefined>,
  open: () => References,
  tagSeal: (tag: string, r: References) => void,
  seal: (r: References) => SinkResult | Promise<SinkResult>,
  close: (r: References, o: Outcome) => void | Promise<void>,
  name: string
}

export type SealEvent = {
  graphComponentType: "Source",
  instance: SourceInstance<any, any>
} | {
  graphComponentType: "Derivation",
  instance: DerivationInstance<any, any, any>,
  member: any
} | {
  graphComponentType: "Sink",
  instance: SinkInstance<any, any, any>,
  result: any
}

/**
 * 1. A graph component can only have one Controller.
 * 2. If a Controller manages a Source, it also manages everything downstream
 * of a Source.
 */
export type Controller<Finalization> = {
  name: string,
  seal: (
    sealEvent: SealEvent,
    domain: {
      sources: Set<SourceInstance<any, any>>,
      sinks: Set<SinkInstance<any, any, any>>
    }
  ) => Promise<Option<Outcome>> | Option<Outcome>,
  waitForPressure: number,
  rescue: (
    error: Error,
    event: Option<any>,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>,
    domain: {
      sources: Set<SourceInstance<any, any>>,
      sinks: Set<SinkInstance<any, any, any>>
    }
  ) => Promise<Option<Outcome>> | Option<Outcome>,
  taggedEvent: (
    event: any,
    tag: string,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>,
    domain: {
      sources: Set<SourceInstance<any, any>>,
      sinks: Set<SinkInstance<any, any, any>>
    }
  ) => Promise<Option<Outcome>> | Option<Outcome>
}
