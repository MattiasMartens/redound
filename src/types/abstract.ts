import { PossiblyAsyncResult } from '@/patterns/async'
import {
  Either
} from 'fp-ts/lib/Either'
import {
  Option
} from 'fp-ts/lib/Option'
import { GenericEmitterInstance, PayloadTypeOf, SourceInstance, Emitter, SinkInstance, DerivationInstance } from './instances'

export type Outcome<T, Finalization> = Either<{
  error: Error,
  event: Option<T>
}, {
  finalization: Finalization
}>

export type GenericEmitter<References> = {
  /** In general, it should be enforced that the type of instances of Event<T> is confined to the subtypes specified in `emits`. In TypeScript it is best to offer the ability to enforce it at runtime. */
  emits: Set<any>,
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
  name: string
}

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
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
  pull?: (query: Query, r: References, tag: string) => Either<
    Error,
    PossiblyAsyncResult<T>
  >,
  // Experiment -- mechanism to induce an effect upstream of
  // the source, using the event paradigm. In essence, in the
  // standard track, upstream data produces events. This
  // method would allow events to produce upstream data.
  push?: (e: T) => Promise<T>,
  // A Source can Push anything it can Emit by definition, but it might also 
  // want to Push things it can't emit (e.g., a Data Access Object without an
  // ID).
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
  // TODO Define query protocol
  unroll: (aggregate: Aggregate, query: any) => PossiblyAsyncResult<T>,
  // TODO define consumes/emits protocol
  consumes: {
    [k in keyof DerivationSourceType]: Set<any>
  },
  emits: Set<any>,
  consume: <K extends keyof DerivationSourceType>(
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K,
      capabilities: {
        push: (event: any, role: string) => Either<Error, void>,
        pull: (params: { query: any, role: string, tag?: string }) => Either<Error, void>
      }
    }
  ) => {
    aggregate: Aggregate,
    output: PossiblyAsyncResult<T>
  },
  open: () => Aggregate,
  seal: (params: {
    aggregate: Aggregate,
    source: Emitter<any>,
    role: keyof DerivationSourceType,
    remainingUnsealedSources: Set<GenericEmitterInstance<any, any>>
  }) => {
    seal?: boolean,
    output?: PossiblyAsyncResult<T>,
    aggregate?: Aggregate
  },
  querySeal: (params: {
    aggregate: Aggregate,
    source: Emitter<any>,
    eventTag: string,
    role: keyof DerivationSourceType,
    remainingUnsealedSources: Set<GenericEmitterInstance<any, any>>
  }) => {
    seal?: boolean,
    output?: PossiblyAsyncResult<T>,
    aggregate?: Aggregate
  },
  close: (m: Aggregate, o: Outcome<any, Finalization>) => void | Promise<void>
}

type Finalization = any
export type Sink<T, References, SinkResult> = {
  graphComponentType: "Sink",
  // TODO Define consumes/emits protocol
  consumes: Set<any>,
  consume: (e: T, r: References, capabilities: {
    push: (event: any, role: string) => Either<Error, void>,
    pull: (query: any, role: string) => Either<Error, void>
  }) => void | Promise<void>,
  open: (
    capabilities: {
      push: (event: any, role: string) => Either<Error, void>,
      pull: (query: any, role: string) => Either<Error, void>
    }
  ) => References,
  seal: (r: References) => SinkResult | Promise<SinkResult>,
  close: (r: References, o: Outcome<any, Finalization>) => void | Promise<void>,
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
  ) => Promise<Option<Outcome<any, Finalization>>> | Option<Outcome<any, Finalization>>,
  rescue: (
    error: Error,
    event: Option<any>,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>,
    domain: {
      sources: Set<SourceInstance<any, any>>,
      sinks: Set<SinkInstance<any, any, any>>
    }
  ) => Promise<Option<Outcome<any, Finalization>>> | Outcome<any, Finalization>,
  taggedEvent: (
    event: any,
    tag: string,
    notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>,
    domain: {
      sources: Set<SourceInstance<any, any>>,
      sinks: Set<SinkInstance<any, any, any>>
    }
  ) => Promise<Option<Outcome<any, Finalization>>> | Option<Outcome<any, Finalization>>
}
