import { voidPromiseIterable } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  Event,
  MetaEvent,
  Outcome,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller } from '@/types/instances'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
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

export function initializeSource<T, References, Finalization, Query>(source: Source<T, References, Finalization, Query>, { id, tick, controller }: { id?: string, tick?: number, controller?: Controller<Finalization, Query> }): SourceInstance<T, References, Finalization, Query> {
  const tag = initializeTag(
    source.name,
    id
  )

  return {
    clock: clock(tick),
    prototype: source,
    lifecycle: {
      state: "READY"
    },
    consumers: new Set(),
    references: none,
    backpressure: none,
    controller: fromNullable(controller),
    id: tag
  }
}

export async function emit<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  event: Event<T, Query> | MetaEvent<Query>
) {
  if (source.lifecycle.state === "ACTIVE") {
    if (isSome(source.backpressure)) {
      await source.backpressure.value
    }

    source.backpressure = some(
      voidPromiseIterable(
        mapIterable(
          source.consumers,
          async c => c.consume(event)
        )
      ).then(() => void (source.backpressure = none))
    )
  } else {
    throw new Error(`Attempted action emit() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function open<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>
) {
  if (source.lifecycle.state === "READY") {
    const emitToSource = (e: Event<T, never> | MetaEvent<Query>) => emit(source, e)
    source.lifecycle.state = "ACTIVE"
    const references = source.prototype.open(emitToSource)
    source.references = some(references)
  } else {
    throw new Error(`Attempted action open() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function subscribe<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  consumer: GenericConsumerInstance<T, Finalization, Query>
) {
  if (source.lifecycle.state !== "ENDED") {
    if (source.lifecycle.state === "READY") {
      open(source)
    }

    source.consumers.add(consumer)
  } else {
    throw new Error(`Attempted action subscribe() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
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
  if (source.lifecycle.state === "ACTIVE") {
    source.lifecycle.state = "SEALED"

    forEachIterable(
      source.consumers,
      consumer => consumer.seal(source)
    )
  } else if (source.lifecycle.state === "ENDED") {
    // no-op
  } else {
    throw new Error(`Attempted action seal() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function close<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  outcome: Outcome<T, Finalization, Query>
) {
  if (source.lifecycle.state !== "ENDED" && source.lifecycle.state !== "READY") {
    source.lifecycle = {
      outcome,
      state: "ENDED"
    }

    forEachIterable(
      source.consumers,
      consumer => consumer.close(outcome)
    )
  } else {
    throw new Error(`Attempted action close() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}
