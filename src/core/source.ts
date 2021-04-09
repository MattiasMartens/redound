import { forEachIterable } from '@/patterns/iterables'
import {
  Event,
  MetaEvent,
  Outcome,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance } from '@/types/instances'
import { isNone, none, some } from 'fp-ts/lib/Option'
import { clock } from './clock'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Source<T, References, never, never>) {
  return source
}

export function initializeSource<T, References, Finalization, Query>(source: Source<T, References, Finalization, Query>, { id, tick }: { id?: string, tick?: number }): SourceInstance<T, References, Finalization, Query> {
  const tag = initializeTag(
    source.name,
    id
  )

  return {
    clock: clock(tick),
    prototype: source,
    sealed: false,
    lifecycle: {
      state: "READY"
    },
    consumers: new Set(),
    references: none,
    tag
  }
}

export async function emit<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  event: Event<T, Query> | MetaEvent<Query>
) {
  if (source.lifecycle.state === "ACTIVE") {
    forEachIterable(
      source.consumers,
      c => c.consume(event)
    )
  } else {
    throw new Error(`Attempted action emit() in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function open<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>
) {
  // TODO
}

export async function subscribe<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  consumer: GenericConsumerInstance<T, Finalization, Query>
) {

  source.consumers.add(consumer)
}

export function unsubscribe<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  consumer: GenericConsumerInstance<T, Finalization, Query>
) {
  source.consumers.delete(consumer)
}

export function seal<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>
) {
  source.sealed = true

  forEachIterable(
    source.consumers,
    consumer => consumer.seal(source)
  )
}

export function close<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  outcome: Outcome<T, Finalization, Query>
) {
  if (source.lifecycle.state !== "ENDED") {
    source.lifecycle = {
      outcome,
      state: "ENDED"
    }

    forEachIterable(
      source.consumers,
      consumer => consumer.close(outcome)
    )
  } else {
    throw new Error(`Tried to close source ${source.tag} after it had already been closed`)
  }
}
