import { Derivation, Sink } from "@/types/abstract";
import { Controller, DerivationInstance, GenericConsumerInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { initializeDerivationInstance } from "./derivation";
import { initializeSinkInstance } from "./sink";
import { open as sourceOpen } from "./source";
import { subscribe as sourceSubscribe } from "./source";
import {
  subscribe as derivationSubscribe
} from "./derivation";

export function makeSink<T, References, Finalization, Query>(sink: Sink<T, References, Finalization, Query>, sourceInstance: SourceInstance<T, any, Finalization, Query>, params: { id?: string, controller?: Controller<Finalization, Query> } = {}): SinkInstance<T, References, Finalization, Query> {
  const sinkInstance = initializeSinkInstance(
    sink,
    sourceInstance,
    params
  )

  sourceSubscribe(
    sourceInstance,
    sinkInstance
  )

  return sinkInstance
}

export function makeDerivation<T, Member, Finalization, Query>(
  derivation: Derivation<T, Member, Finalization, Query>,
  sourcesByRole: DerivationInstance<T, Member, Finalization, Query>["sourcesByRole"],
  params: { id?: string, controller?: Controller<Finalization, Query> } = {}
) {
  const derivationInstance = initializeDerivationInstance(
    derivation,
    sourcesByRole,
    params
  )
}

export async function subscribe<T, Finalization, Query>(
  derivation: DerivationInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  return derivationSubscribe(
    derivation,
    consumer,
    sourceOpen
  )
}
