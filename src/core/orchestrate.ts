import { Sink } from "@/types/abstract";
import { ControllerInstance, DerivationInstance, EmitterInstanceAlias, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { instantiateDerivation as makeDerivation } from "./derivation";
import { instantiateSink } from "./sink";
import { subscribe as sourceSubscribe } from "./source";
import {
  subscribe as derivationSubscribeCore
} from "./derivation";

export function makeSink<T, References>(sink: Sink<T, References>, sourceInstance: GenericEmitterInstance<T, any>, params: { id?: string, controller?: ControllerInstance<any> } = {}): SinkInstance<T, References> {
  const sinkInstance = instantiateSink(
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

