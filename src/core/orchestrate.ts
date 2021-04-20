import { Derivation, Sink } from "@/types/abstract";
import { Controller, DerivationInstance, EmitterInstanceAlias, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { initializeDerivationInstance as makeDerivation } from "./derivation";
import { initializeSinkInstance } from "./sink";
import { subscribe as sourceSubscribe } from "./source";
import {
  subscribe as derivationSubscribeCore
} from "./derivation";

export function makeSink<T, References, Finalization>(sourceInstance: GenericEmitterInstance<T, any>, sink: Sink<T, References>, params: { id?: string, controller?: Controller<Finalization> } = {}): SinkInstance<T, References> {
  const sinkInstance = initializeSinkInstance(
    sink,
    sourceInstance,
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

  return sinkInstance
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

export function makeUnaryDerivation<U, T>(
  source: EmitterInstanceAlias<U>,
  derivation: Derivation<{ main: EmitterInstanceAlias<U> }, T, any>, params: { id?: string } = {}): DerivationInstance<{ main: EmitterInstanceAlias<U> }, T, any> {
  return makeDerivation(derivation, { main: source }, params)
}
