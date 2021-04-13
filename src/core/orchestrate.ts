import { Derivation, Sink } from "@/types/abstract";
import { Controller, DerivationInstance, EmitterInstanceAlias, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { initializeDerivationInstance as makeDerivation } from "./derivation";
import { initializeSinkInstance } from "./sink";
import { subscribe as sourceSubscribe } from "./source";
import {
  subscribe as derivationSubscribeCore
} from "./derivation";

export function makeSink<T, References, Finalization>(sourceInstance: GenericEmitterInstance<T, any, Finalization>, sink: Sink<T, References, Finalization>, params: { id?: string, controller?: Controller<Finalization> } = {}): SinkInstance<T, References, Finalization> {
  const sinkInstance = initializeSinkInstance(
    sink,
    sourceInstance,
    params
  )

  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any, any>,
      sinkInstance
    )
  } else {
    derivationSubscribe(
      sourceInstance as DerivationInstance<any, any, any, any>,
      sinkInstance
    )
  }

  return sinkInstance
}

export function derivationSubscribe<T, Finalization>(
  derivation: DerivationInstance<any, T, any, Finalization>,
  consumer: GenericConsumerInstance<T, any, Finalization>
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
  derivation: Derivation<{ main: EmitterInstanceAlias<U> }, T, any, any>, params: { id?: string } = {}): DerivationInstance<{ main: EmitterInstanceAlias<U> }, T, any, any> {
  return makeDerivation(derivation, { main: source }, params)
}
