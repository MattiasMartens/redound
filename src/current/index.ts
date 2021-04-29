import { makeController, makeDerivation, makeSink, makeSource } from "@/core"
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
      return makeSink(
        wrapped,
        source,
        { id }
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
export function head<T, T1, T2, T3, Out extends WrappedUnaryDerivation<T2, T3> | WrappedSink<T2, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, WrappedUnaryDerivation<T2, T3>, Out]
): Out extends WrappedSink<T2, infer R> ? SinkInstance<T2, any, R> : UnaryDerivationInstance<T2, T3>
export function head<T, T1, T2, Out extends WrappedUnaryDerivation<T1, T2> | WrappedSink<T1, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [WrappedUnaryDerivation<T, T1>, WrappedUnaryDerivation<T1, T2>, Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T1, any, R> : UnaryDerivationInstance<T1, T2>
export function head<T, T1, Out extends WrappedUnaryDerivation<T, T1> | WrappedSink<T, any>>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  source: WrappedSource<T>,
  ...rest: [Out]
): Out extends WrappedSink<T, infer R> ? SinkInstance<T, any, R> : UnaryDerivationInstance<T, T1>
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

/**
 * Source OR source-role dictionary, downstream transforms (can end with sink) 
 */
export async function join(

) {

}
