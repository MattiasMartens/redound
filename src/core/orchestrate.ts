import { Sink } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances"
import { instantiateDerivation as makeDerivation } from "./derivation"
import { AsyncIterableSink, instantiateAsyncIterableSink, instantiateSink } from "./sink"
import { subscribe as sourceSubscribe } from "./source"
import {
  subscribe as derivationSubscribeCore
} from "./derivation"
import { isNone } from "fp-ts/lib/Option"

export function makeSink<T>(sink: ReturnType<typeof AsyncIterableSink>, sourceInstance: Emitter<T>, params?: { siphon?: boolean, id?: string, controller?: ControllerInstance<any> }): SinkInstance<T, void, void>
export function makeSink<T, References, SinkResult>(sink: Sink<T, References, SinkResult> | ReturnType<typeof AsyncIterableSink>, sourceInstance: Emitter<T>, params?: { siphon?: boolean, id?: string, controller?: ControllerInstance<any> }): SinkInstance<T, References, SinkResult>
export function makeSink<T, References, SinkResult>(sink: Sink<T, References, SinkResult> | ReturnType<typeof AsyncIterableSink>, sourceInstance: Emitter<T>, params: { siphon?: boolean, id?: string, controller?: ControllerInstance<any> } = {}): SinkInstance<T, References, SinkResult> {

  const sinkInstance = sink === AsyncIterableSink() ? makeAsyncIterableSink(sourceInstance, params) : instantiateSink(
    sink as Sink<T, References, SinkResult>,
    params
  )

  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any>,
      sinkInstance
    )
  } else {
    derivationSubscribe(
      sourceInstance as DerivationInstance<any, any, any>,
      sinkInstance
    )
  }

  if (params.siphon === false && isNone(sinkInstance.controller)) {
    throw new Error(`Cannot set 'siphon' to false without a controller to mediate`)
  }

  return sinkInstance as SinkInstance<T, References, SinkResult>
}

const asyncIterableSubscribe = <T>(sourceInstance: Emitter<T>) => (sinkInstance: SinkInstance<T, any, any>) => {
  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any>,
      sinkInstance
    )
  } else {
    derivationSubscribe(
      sourceInstance as DerivationInstance<any, any, any>,
      sinkInstance
    )
  }
}

export function makeAsyncIterableSink<T>(emitter: Emitter<T>, params: { id?: string } = {}) {
  return instantiateAsyncIterableSink(
    asyncIterableSubscribe(emitter),
    params
  )
}

export function derivationSubscribe<T>(
  derivation: DerivationInstance<any, T, any>,
  consumer: GenericConsumerInstance<T, any>
) {
  return derivationSubscribeCore(
    derivation,
    consumer,
    sourceSubscribe
  )
}

export { makeDerivation }

