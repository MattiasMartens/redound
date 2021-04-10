import { Sink } from "@/types/abstract";
import { Controller, SinkInstance, SourceInstance } from "@/types/instances";
import { initializeSinkInstance } from "./sink";
import { subscribe } from "./source";

export function makeSink<T, References, Finalization, Query>(sink: Sink<T, References, Finalization, Query>, sourceInstance: SourceInstance<T, any, Finalization, Query>, params: { id?: string, controller?: Controller<Finalization, Query> } = {}): SinkInstance<T, References, Finalization, Query> {
  const sinkInstance = initializeSinkInstance(
    sink,
    sourceInstance,
    params
  )

  subscribe(
    sourceInstance,
    sinkInstance
  )

  return sinkInstance
}