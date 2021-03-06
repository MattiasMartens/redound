import { Outcome } from "@/types/abstract"
import { DerivationInstance, GenericConsumerInstance, GenericEmitterInstance, SinkInstance } from "@/types/instances"
import {
  consume as sinkConsume
} from "./sink"

import {
  consume as derivationConsume,
  close as derivationClose
} from "./derivation"
import { ControlEvent } from "@/types/events"
import { Possible } from "@/types/patterns"

export function consume<T, MemberOrReferences>(
  emitter: GenericEmitterInstance<T, MemberOrReferences>,
  consumer: GenericConsumerInstance<T, any>,
  event: T | ControlEvent,
  tag: Possible<string>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    return sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences, any>,
      event,
      tag
    )
  } else if (consumer.prototype.graphComponentType === "Derivation") {
    return derivationConsume(
      emitter,
      consumer as DerivationInstance<any, any, MemberOrReferences>,
      event,
      tag
    )
  } else {
    throw new Error(`Attempted consume on illegal graph component with ID ${consumer.id} and type ${(consumer.prototype as any).graphComponentType}`)
  }
}

type Finalization = any
export function close<T, MemberOrReferences>(
  consumer: GenericConsumerInstance<T, MemberOrReferences>,
  outcome: Outcome
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    (consumer as SinkInstance<T, MemberOrReferences, any>).close(
      outcome
    )
  } else {
    derivationClose(
      consumer as DerivationInstance<any, any, any>,
      outcome
    )
  }
}
