import { Sink } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances"
import { instantiateDerivation as makeDerivation } from "./derivation"
import { instantiateAsyncIterableSink, instantiateSink } from "./sink"
import { subscribe as sourceSubscribe } from "./source"
import {
  subscribe as derivationSubscribeCore
} from "./derivation"

export function makeSink<T, References, SinkResult>(sink: Sink<T, References, SinkResult>, sourceInstance: Emitter<T>, params: { siphon?: boolean, id?: string, controller?: ControllerInstance<any> } = {}): SinkInstance<T, References, SinkResult> {
  const sinkInstance = instantiateSink(
    sink,
    params
  )

  const { siphon = true } = params

  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any>,
      sinkInstance,
      siphon
    )
  } else {
    derivationSubscribe(
      sourceInstance as DerivationInstance<any, any, any>,
      sinkInstance,
      siphon
    )
  }

  return sinkInstance
}

const asyncIterableSubscribe = <T>(sourceInstance: Emitter<T>) => (sinkInstance: SinkInstance<T, any, any>) => {
  if (!sourceInstance.prototype) {
    debugger;;;;;;;;;
  }

  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any>,
      sinkInstance,
      true
    )
  } else {
    derivationSubscribe(
      sourceInstance as DerivationInstance<any, any, any>,
      sinkInstance,
      true
    )
  }
}

export function makeAsyncIterableSink<T>(emitter: Emitter<T>, params: { id?: string } = {}) {
  debugger
  return instantiateAsyncIterableSink(
    asyncIterableSubscribe(emitter),
    params
  )
}

export function derivationSubscribe<T>(
  derivation: DerivationInstance<any, T, any>,
  consumer: GenericConsumerInstance<T, any>,
  siphon = true
) {
  return derivationSubscribeCore(
    derivation,
    consumer,
    sourceSubscribe,
    siphon
  )
}

export { makeDerivation }

