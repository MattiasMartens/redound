import {
  mapCollectInto, reconcileFold
} from 'big-m'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  BroadEvent,
  Event,
  MetaEvent,
  Outcome,
  Sink
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller, SinkInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock } from './clock'
import { initializeTag } from './tags'
import { identity } from '@/patterns/functions'


/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References>(sink: Sink<T, References, never, never>) {
  return sink
}

export function initializeSinkInstance<T, References, Finalization, Query>(sink: Sink<T, References, Finalization, Query>, { id, tick, controller }: { id?: string, tick?: number, controller?: Controller<Finalization, Query> }, sourceInstance: SourceInstance<T, References, Finalization, Query>): SinkInstance<T, References, Finalization, Query> {
  const tag = initializeTag(
    sink.name,
    id
  )

  return {
    prototype: sink,
    latestTickByProvenance: new Map(),
    lifecycle: {
      state: "ACTIVE"
    },
    source: sourceInstance,
    references: none,
    controller: fromNullable(controller),
    id: tag
  }
}

export async function consume<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  sink: SinkInstance<T, References, Finalization, Query>,
  e: BroadEvent<T, Query>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just update the sink's provenance clock.
    } else if (e.type === "SEAL") {
      // also no-op: The sink doesn't care about this, at least until it triggers
      // the controller to close it.
    } else {
      const references = getSome(sink.references)
      await sink.prototype.consume(e as Event<T, Query>, references)
    }

    mapCollectInto(
      e.provenance,
      sink.latestTickByProvenance,
      reconcileFold(
        identity,
        (currentLatestTick, incomingTick) => {
          if (incomingTick >= currentLatestTick) {
            return incomingTick
          } else {
            throw new Error(`Events may not arrive to a sink out of order`)
          }
        }
      )
    )
  } else {
    throw new Error(`Attempted action consume() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function close<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  sink: SinkInstance<T, References, Finalization, Query>,
  outcome: Outcome<T, Finalization, Query>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    const references = getSome(sink.references)

    await sink.prototype.close(references, outcome)
  } else {
    throw new Error(`Attempted action close() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}
