import { voidPromiseIterable, wrapAsync } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  SourceEvent,
  CoreEvent,
  MetaEvent,
  Outcome,
  QueryState,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller } from '@/types/instances'
import {
  noop
} from '@/patterns/functions'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock, tick } from './clock'
import { consume, close as consumerClose } from './consumer'
import { bareSourceEmittedToEvent } from './events'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { createSetFromNullable } from '@/patterns/sets'
import { backpressure } from './backpressure'

// Dependency Map:
// source imports sink
// source imports consumer
// source imports controller
// consumer imports sink
// consumer imports derivation
// derivation imports sink
// (there is no need for a generic "emitter")

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Omit<Source<T, References, never, never>, "graphComponentType" | "pull">) {
  return Object.assign(
    source,
    {
      graphComponentType: "Source",
      pull: noop
    }
  ) as Source<T, References, never, never>
}

export function initializeSourceInstance<T, References, Finalization, Query>(source: Source<T, References, Finalization, Query>, { id, tick, controller }: { id?: string, tick?: number, controller?: Controller<Finalization, Query> } = {}): SourceInstance<T, References, Finalization, Query> {
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
    backpressure: backpressure(),
    controller: fromNullable(controller),
    id: tag
  }
}

export async function emit<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  event: CoreEvent<T, Query> | MetaEvent<Query>
) {
  if (source.lifecycle.state === "ACTIVE") {
    voidPromiseIterable(
      mapIterable(
        source.consumers,
        async c => consume(source, c, event)
      )
    )
  } else {
    throw new Error(`Attempted action emit() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function open<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>
) {
  if (source.lifecycle.state === "READY") {
    const sourceEmit = (e: SourceEvent<T>) => {
      tick(source.clock)
      return emit(
        source,
        bareSourceEmittedToEvent(
          e,
          source
        )
      )
    }

    source.lifecycle.state = "ACTIVE"
    const references = source.prototype.open()
    source.references = some(references)

    // TODO Pass failure here to controller if any
    wrapAsync(
      () => source.prototype.generate(
        sourceEmit,
        references
      )
    ).then(
      (doNotSeal) => doNotSeal || seal(source)
    )
  } else {
    throw new Error(`Attempted action open() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function subscribe<T, Finalization, Query>(
  source: SourceInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  if (source.lifecycle.state !== "ENDED") {
    source.consumers.add(consumer)

    if (isSome(source.controller)) {
      propagateController(
        consumer,
        source.controller.value
      )
    }

    if (source.lifecycle.state === "READY") {
      console.log('opening')
      open(source)
    }
  } else {
    throw new Error(`Attempted action subscribe() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function sealEvent<Query>(
  source: SourceInstance<any, any, any, Query>,
  q?: QueryState<Query>
): MetaEvent<Query> {
  return {
    type: "SEAL",
    cause: createSetFromNullable(q),
    provenance: new Map([
      [source.id, source.clock.tick]
    ])
  }
}

export function unsubscribe<T, Finalization, Query>(
  source: SourceInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  source.consumers.delete(consumer)
}

export function seal<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  query?: QueryState<Query>
) {
  if (source.lifecycle.state === "ACTIVE") {
    source.lifecycle.state = "SEALED"

    tick(source.clock)
    const e = sealEvent(source, query)

    forEachIterable(
      source.consumers,
      consumer => consume(
        source,
        consumer,
        e
      )
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
      consumer => consumerClose(
        source,
        consumer,
        outcome
      )
    )
  } else {
    throw new Error(`Attempted action close() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}
