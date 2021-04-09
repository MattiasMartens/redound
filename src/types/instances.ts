import { Option } from "fp-ts/lib/Option";
import { Derivation, Event, MetaEvent, Outcome, Sink, Source } from "./abstract";
import { Clock } from '@/core/clock'

export type GenericConsumerInstance<T, Finalization, Query> = {
  consume: (e: Event<T, Query> | MetaEvent<Query>) => Promise<void>,
  close: (o: Outcome<T, Finalization, Query>) => Promise<void>,
  seal: (source: SourceInstance<any, any, any, any>) => Promise<void>
}

export type SourceInstance<T, References, Finalization, Query> = {
  clock: Clock,
  prototype: Source<T, References, Finalization, Query>,
  consumers: Set<GenericConsumerInstance<T, Finalization, Query>>,
  sealed: boolean,
  lifecycle: { state: "READY" | "ACTIVE" | "SEALED" } | { state: "ENDED", outcome: Outcome<T, Finalization, Query> },
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>,
  tag: string
}

export type DerivationInstance<T, Member, Finalization, Query> = {
  prototype: Derivation<T, Member, Finalization, Query>
}

export type SinkInstance<T, Finalization, Query, References> = {
  prototype: Sink<T, Finalization, Query, References>
}
