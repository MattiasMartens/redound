import { Event, MetaEvent, Outcome } from "@/types/abstract"
import { GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances"
import {
  consume as sinkConsume,
  close as sinkClose
} from "./sink"

export function consume<T, MemberOrReferences, Finalization, Query>(
  emitter: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>,
  event: Event<T, Query> | MetaEvent<Query>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences, Finalization, Query>,
      event
    )
  } else {
    // TODO derivationConsume
  }
}

export function close<T, MemberOrReferences, Finalization, Query>(
  source: SourceInstance<T, MemberOrReferences, Finalization, Query>,
  consumer: GenericConsumerInstance<T, MemberOrReferences, Finalization, Query>,
  outcome: Outcome<T, Finalization, Query>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    sinkClose(
      source,
      consumer as SinkInstance<T, MemberOrReferences, Finalization, Query>,
      outcome
    )
  } else {
    // TODO derivationConsume
  }
}