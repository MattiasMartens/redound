import { makeController, makeDerivation, makeSink, makeSource } from "@/core"
import { makeAsyncIterableSink } from "@/core/orchestrate"
import { Controller, Derivation, Sink, Source } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, SinkInstance, SourceInstance, UnaryDerivationInstance } from "@/types/instances"
import { Possible } from "@/types/patterns"

export type WrappedSource<T> = Source<T, any> | {
  role?: string,
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
}

function normalizeControllerArg(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER"
) {
  if (controller === "NO_CONTROLLER") {
    return undefined
  } else if ("prototype" in controller) {
    return controller
  } else {
    return makeController(controller)
  }
}

function makeSourceFromArg<T>(wrappedSource: WrappedSource<T>, controller: Possible<ControllerInstance<any>>) {
  if ("wrapped" in wrappedSource) {
    const {
      wrapped,
      id,
      role
    } = wrappedSource

    return makeSource(
      wrapped,
      { id, controller, role }
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
    throw new Error(`Tried to connect a downstream component to a sink, this is illegal. Sink: ${source.id}; downstream: ${"wrapped" in wrappedComponent ? (wrappedComponent.id ?? wrappedComponent.wrapped.name) : wrappedComponent.name}`)
  }

  if ("wrapped" in wrappedComponent) {
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
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>, Out]
): Out extends WrappedSink<T3, infer R> ? SinkInstance<T3, any, R> : Out extends WrappedUnaryDerivation<T3, infer T4> ? UnaryDerivationInstance<T3, T4> : never
export function head<T, T1, T2, Out extends WrappedUnaryDerivation<T2, any> | WrappedSink<T2, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, Out]
): Out extends WrappedSink<T2, infer R> ? SinkInstance<T2, any, R> : Out extends WrappedUnaryDerivation<T2, infer T3> ? UnaryDerivationInstance<T2, T3> : never
export function head<T, T1, T2, Out extends WrappedUnaryDerivation<T1, T2> | WrappedSink<T1, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T1, any, R> : Out extends WrappedUnaryDerivation<T, infer T2> ? UnaryDerivationInstance<T1, T2> : never
export function head<T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T, any, R> : Out extends WrappedUnaryDerivation<T, infer T1> ? UnaryDerivationInstance<T, T1> : never
export function head<T>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
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
    "wrapped" in derivation
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
export function join<SourceType extends Record<string, Emitter<any>>, T, T1, T2, Out extends WrappedUnaryDerivation<T, T1> | WrappedSink<T, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T1, T2>, Out]
): Out extends WrappedSink<T2, infer R> ? SinkInstance<T2, any, R> : Out extends WrappedUnaryDerivation<T2, infer T3> ? UnaryDerivationInstance<T2, T3> : never
export function join<SourceType extends Record<string, Emitter<any>>, T, T1, T2, Out extends WrappedUnaryDerivation<T, T1> | WrappedSink<T, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): Out extends WrappedSink<T1, infer R> ? SinkInstance<T1, any, R> : Out extends WrappedUnaryDerivation<T1, infer T2> ? UnaryDerivationInstance<T1, T2> : never
export function join<SourceType extends Record<string, Emitter<any>>, T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  emitters: SourceType,
  derivation: WrappedDerivation<SourceType, T>,
  ...rest: [Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T, any, R> : Out extends UnaryDerivationInstance<T, infer T1> ? UnaryDerivationInstance<T, T1> : never
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

/**
 * Connect a chain of unary derivations, possibly ending with a sink, to an instantiated emitter.
 */
export function course<T, T1, T2, T3, Out extends WrappedUnaryDerivation<T3, any> | WrappedSink<T3, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>, Out]
): Out extends WrappedSink<T3, infer R> ? SinkInstance<T3, any, R> : Out extends WrappedUnaryDerivation<T3, infer T4> ? UnaryDerivationInstance<T3, T4> : never
export function course<T, T1, T2, Out extends WrappedUnaryDerivation<T2, any> | WrappedSink<T2, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, Out]
): Out extends WrappedSink<T2, infer R> ? SinkInstance<T2, any, R> : Out extends WrappedUnaryDerivation<T2, infer T3> ? UnaryDerivationInstance<T2, T3> : never
export function course<T, T1, Out extends WrappedUnaryDerivation<T1, any> | WrappedSink<T1, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, Out]
): Out extends WrappedSink<T1, infer R> ? SinkInstance<T1, any, R> : Out extends WrappedUnaryDerivation<T1, infer T2> ? UnaryDerivationInstance<T1, T2> : never
export function course<T, Out extends WrappedUnaryDerivation<T, any> | WrappedSink<T, any>>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T, any, R> : Out extends WrappedUnaryDerivation<T, infer T1> ? UnaryDerivationInstance<T, T1> : never
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

export function courseIntoIterable<T, T1, T2, T3>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>]
): SinkInstance<T3, any, void> & AsyncIterable<T3>
export function courseIntoIterable<T, T1, T2>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>]
): SinkInstance<T2, any, void> & AsyncIterable<T2>
export function courseIntoIterable<T, T1>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: [WrappedUnaryDerivation<T, T1>]
): SinkInstance<T1, any, void> & AsyncIterable<T1>
export function courseIntoIterable<T>(
  emitter: DerivationInstance<any, T, any> | SourceInstance<T, any>,
  ...rest: []
): SinkInstance<T, any, void> & AsyncIterable<T>
export function courseIntoIterable(
  emitter: any,
  ...segments: any
) {
  let lastOfChain: any = emitter

  for (const s of segments) {
    const newComponent = makeUnaryDerivationOrSinkFromArg(s, lastOfChain)
    lastOfChain = newComponent
  }

  return makeAsyncIterableSink(lastOfChain)
}
