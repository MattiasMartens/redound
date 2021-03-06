import { makeController, makeDerivation, makeSink, makeSource } from "@/core"
import { makeAsyncIterableSink } from "@/core/orchestrate"
import { AsyncIterableSink, asyncIterableSink, AsyncIterableSinkInstance } from "@/core/sink"
import { Controller, Derivation, Sink, Source } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, SinkInstance, SourceInstance, UnaryDerivationInstance } from "@/types/instances"
import { Possible } from "@/types/patterns"

export type WrappedSource<T> = Source<T, any> | {
  id?: string,
  wrapped: Source<T, any>
}

export type WrappedDerivation<T extends Record<string, Emitter<any>>, Out> = Derivation<T, Out, any> | {
  id?: string,
  wrapped: Derivation<T, Out, any>
}

export type WrappedUnaryDerivation<T, Out> = Derivation<{ main: Emitter<T> }, Out, any> | {
  role?: string,
  id?: string,
  wrapped: Derivation<{ main: Emitter<T> }, Out, any>
}

export type WrappedSink<T, R> = Sink<T, any, R> | {
  id?: string,
  siphon?: boolean,
  wrapped: Sink<T, any, R>
} | AsyncIterableSink<T>

function normalizeControllerArg(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC'
) {
  if (controller === 'NO_CONTROLLER') {
    return undefined
  } else if (controller === 'GENERIC') {
    return makeController()
  } else if ('prototype' in controller) {
    return controller
  } else {
    return makeController(controller)
  }
}

function makeSourceFromArg<T>(wrappedSource: WrappedSource<T>, controller: Possible<ControllerInstance<any>>) {
  if ('wrapped' in wrappedSource) {
    const {
      wrapped,
      id
    } = wrappedSource

    return makeSource(
      wrapped,
      { id, controller }
    )
  } else {
    return makeSource(
      wrappedSource,
      { controller }
    )
  }
}

function makeUnaryDerivationOrSinkFromArg<T, Out, R>(wrappedComponent: WrappedUnaryDerivation<T, Out> | WrappedSink<T, R>, source: SourceInstance<T, any> | DerivationInstance<any, T, any>) {
  // @ts-ignore
  if (source.prototype.graphComponentType === "Sink") {
    throw new Error(`Tried to connect a downstream component to a sink, this is illegal. Sink: ${source.id}; downstream: ${'wrapped' in wrappedComponent
      ? (wrappedComponent.id ?? wrappedComponent.wrapped.name)
      : wrappedComponent.name}`)
  }

  if ('wrapped' in wrappedComponent) {
    const {
      wrapped,
      id
    } = wrappedComponent

    if (wrapped.graphComponentType === "Derivation") {
      return makeDerivation(
        wrapped,
        { main: source },
        { id }
      )
    } else {
      const { siphon } = wrappedComponent as any

      return makeSink(
        wrapped,
        source,
        { id, siphon }
      )
    }
  } else {
    if (wrappedComponent.graphComponentType === "Derivation") {
      return makeDerivation(
        wrappedComponent,
        { main: source }
      )
    } else {
      return makeSink(
        wrappedComponent,
        source
      )
    }
  }
}

/**
 * Controller, source, any number of downstream transforms (sink allowed at the end)
 */
/** TODO Extend when the need arises! */
export function head<T, T1, T2, T3, Out extends WrappedUnaryDerivation<T3, any> | WrappedSink<T3, any>>(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC',
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>, Out]
): OutInstanceType<Out, T3>
export function head<T, T1, T2, Out extends WrappedUnaryDerivation<T2, any> | WrappedSink<T2, any>>(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC',
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, Out]
): OutInstanceType<Out, T2>
export function head<T, T1, T2, Out extends WrappedUnaryDerivation<T1, T2> | WrappedSink<T1, any>>(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC',
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): OutInstanceType<Out, T1>
export function head<T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC',
  source: WrappedSource<T>,
  ...rest: [Out]
): OutInstanceType<Out, T>
export function head<T>(
  controller: ControllerInstance<any> | Controller<any> | 'NO_CONTROLLER' | 'GENERIC',
  source: WrappedSource<T>,
  ...rest: []
): SourceInstance<T, any>
export function head(
  controller: any,
  source: any,
  ...segments: any
) {
  const createdSource = makeSourceFromArg(
    source,
    normalizeControllerArg(
      controller
    )
  )

  let lastOfChain: any = createdSource

  for (const s of segments) {
    const newComponent = makeUnaryDerivationOrSinkFromArg(s, lastOfChain)
    lastOfChain = newComponent
  }

  return lastOfChain
}

function makeWrappedDerivationFromArg<T extends Record<string, Emitter<any>>, Out>(derivation: WrappedDerivation<T, Out>, emitters: T) {
  if (
    'wrapped' in derivation
  ) {
    const { wrapped, id } = derivation
    return makeDerivation(
      wrapped,
      emitters,
      { id }
    )
  } else {
    return makeDerivation(derivation, emitters)
  }
}

/**
 * Supply the emitters to a Derivation by role, then apply downstream transformations.
 */
export function join<SourceType extends Record<string, Emitter<any>>, T, T1, T2, Out extends WrappedUnaryDerivation<T, T1> | WrappedSink<T2, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T1, T2>, Out]
): OutInstanceType<Out, T2>
export function join<SourceType extends Record<string, Emitter<any>>, T, T1, Out extends WrappedUnaryDerivation<T, T1> | WrappedSink<T1, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): OutInstanceType<Out, T1>
export function join<SourceType extends Record<string, Emitter<any>>, T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [Out]
): OutInstanceType<Out, T>
export function join<SourceType extends Record<string, Emitter<any>>, T>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: []
): DerivationInstance<SourceType, T, any>
export function join(
  emitters: any,
  derivation: any,
  ...segments: any
) {
  let lastOfChain: any = makeWrappedDerivationFromArg(derivation, emitters)

  for (const s of segments) {
    const newComponent = makeUnaryDerivationOrSinkFromArg(s, lastOfChain)
    lastOfChain = newComponent
  }

  return lastOfChain
}

export type OutInstanceType<Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>, T> = Out extends AsyncIterableSink<any> ? AsyncIterableSinkInstance<T> : Out extends WrappedSink<T, infer R> ? SinkInstance<T, any, R> : Out extends WrappedUnaryDerivation<T, infer T1> ? UnaryDerivationInstance<T, T1> : never

/**
 * Connect a chain of unary derivations, possibly ending with a sink, to an instantiated emitter.
 */
export function course<T, T1, T2, T3, Out extends WrappedUnaryDerivation<T3, any> | WrappedSink<T3, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>, Out]
): OutInstanceType<Out, T3>
export function course<T, T1, T2, Out extends WrappedUnaryDerivation<T2, any> | WrappedSink<T2, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, Out]
): OutInstanceType<Out, T2>
export function course<T, T1, Out extends WrappedUnaryDerivation<T1, any> | WrappedSink<T1, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): OutInstanceType<Out, T1>
export function course<T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [Out]
): OutInstanceType<Out, T>
export function course<T>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: []
): SourceInstance<T, any>
export function course(
  emitter: any,
  ...segments: any
) {
  let lastOfChain: any = emitter

  for (const s of segments) {
    const newComponent = makeUnaryDerivationOrSinkFromArg(s, lastOfChain)
    lastOfChain = newComponent
  }

  return lastOfChain
}
