import { identity } from "@/patterns/functions"
import { flatMap, mapIterable } from "@/patterns/iterables"
import { createSetFromNullable } from "@/patterns/sets"
import { BareDerivationEmitted, BareSourceEmitted, BroadEvent, CoreEvent, QueryState } from "@/types/abstract"
import { SourceInstance } from "@/types/instances"
import { Possible } from "@/types/patterns"
import { mapCollect, reconcileFold } from "big-m"

export function bareSourceEmittedToEvent<T, Query>(
  bareSourceEmitted: BareSourceEmitted<T>,
  sourceInstance: SourceInstance<T, any, any, Query>,
  query?: QueryState<Query>
): BroadEvent<T, Query> {
  return {
    cause: createSetFromNullable(query),
    ...bareSourceEmitted,
    provenance: new Map([
      [sourceInstance.id, sourceInstance.clock.tick]
    ])
  }
}

const reconcileLarger = <K>() => reconcileFold<K, number, number>(
  identity,
  (colliding, incoming) => Math.max(colliding, incoming)
)

export function bareDerivationEmittedToEvent<T, Query>(bareDerivationEmitted: BareDerivationEmitted<T>): BroadEvent<T, Query> {
  const {
    incitingEvents,
    ...toReEmit
  } = bareDerivationEmitted

  const cause = incitingEvents === undefined ? new Set<QueryState<Query>>() : new Set(
    flatMap(
      incitingEvents,
      t => t.cause
    )
  )

  const provenance = incitingEvents === undefined ? new Map<string, number>() : mapCollect(
    flatMap(
      incitingEvents,
      t => t.provenance
    ),
    reconcileLarger<string>()
  )

  return {
    cause,
    provenance,
    ...toReEmit
  }
}
