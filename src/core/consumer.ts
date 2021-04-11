import { CoreEvent, GenericEmitter, MetaEvent, Outcome } from "@/types/abstract"
import { DerivationInstance, GenericConsumerInstance, GenericEmitterInstance, SinkInstance, SourceInstance } from "@/types/instances"
import {
  consume as sinkConsume,
  close as sinkClose
} from "./sink"

import {
  consume as derivationConsume,
  close as derivationClose
} from "./derivation"

export function consume<T, MemberOrReferences, Finalization, Query>(
  emitter: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>,
  event: CoreEvent<T, Query> | MetaEvent<Query>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    return sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences, Finalization, Query>,
      event
    )
  } else {
    return derivationConsume(
      emitter,
      consumer as DerivationInstance<T, any, MemberOrReferences, Finalization, Query>,
      event
    )
  }
}

export function close<T, MemberOrReferences, Finalization, Query>(
  source: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
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
    derivationClose(
      source as DerivationInstance<T, any, MemberOrReferences, Finalization, Query>,
      outcome
    )
  }
}
