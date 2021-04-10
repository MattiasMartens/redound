import { BareSourceEmitted, BroadEvent, Event, QueryState } from "@/types/abstract"
import { SourceInstance } from "@/types/instances"
import { fromNullable } from "fp-ts/lib/Option"

export function bareSourceEmittedToEvent<T, Query>(
  bareSourceEmitted: BareSourceEmitted<T>,
  sourceInstance: SourceInstance<T, any, any, Query>,
  query?: QueryState<Query>
): BroadEvent<T, Query> {
  return {
    cause: fromNullable(query),
    ...bareSourceEmitted,
    provenance: new Map([
      [sourceInstance.id, sourceInstance.clock.tick]
    ])
  }
}