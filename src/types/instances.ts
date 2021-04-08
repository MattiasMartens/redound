import { Option } from "fp-ts/lib/Option";
import { Derivation, Event, Outcome, Source } from "./abstract";

export type GenericConsumer<T, Query> = {
  consume: (e: Event<T, Query>) => Promise<void>
}

export type SourceInstance<T, References, Finalization, Query> = {
  source: Source<T, References, Finalization, Query>,
  subscribers: Set<GenericConsumer<T, Query>>,
  outcome: Option<Outcome<T, Finalization, Query>>,
  // Initialized to 'Some' on first subscription event,
  // reverted to 'None' once closed.
  references: Option<References>,
  tag: string
}

export type DerivationInstance<T, Member, Finalization, Query> = {
  derivation: Derivation<T, Member, Finalization, Query>
}
