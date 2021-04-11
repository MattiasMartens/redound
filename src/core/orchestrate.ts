import { Derivation, Sink } from "@/types/abstract";
import { Controller, DerivationInstance, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { initializeDerivationInstance } from "./derivation";
import { initializeSinkInstance } from "./sink";
import { open as sourceOpen } from "./source";
import { subscribe as sourceSubscribe } from "./source";
import {
  subscribe as derivationSubscribeCore
} from "./derivation";

export function makeSink<T, References, Finalization, Query>(sink: Sink<T, References, Finalization, Query>, sourceInstance: GenericEmitterInstance<T, any, Finalization, Query>, params: { id?: string, controller?: Controller<Finalization, Query> } = {}): SinkInstance<T, References, Finalization, Query> {
  const sinkInstance = initializeSinkInstance(
    sink,
    sourceInstance,
    params
  )

  if (sourceInstance.prototype.graphComponentType === "Source") {
    sourceSubscribe(
      sourceInstance as SourceInstance<any, any, any, any>,
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

export function derivationSubscribe<T, Finalization, Query>(
  derivation: DerivationInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  return derivationSubscribeCore(
    derivation,
    consumer,
    sourceOpen
  )
}
