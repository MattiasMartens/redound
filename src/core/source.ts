import { voidPromiseIterable } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  BareSourceEmitted,
  Event,
  MetaEvent,
  Outcome,
  QueryState,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller } from '@/types/instances'
import { fromPredicate, isNone, isSome, Option, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock, tick } from './clock'
import { consume, close as consumerClose } from './consumer'
import { bareSourceEmittedToEvent } from './events'
import { initializeTag } from './tags'

// Dependency Map:
// source imports sink
// source imports derivation
// source imports consumer
// consumer imports sink
// consumer imports derivation
// (there is no need for a generic "emitter")

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Omit<Source<T, References, never, never>, "graphComponentType" | "pull">) {
  // @ts-ignore
  source.graphComponentType = "Source"
  // @ts-ignore
  source.pull = noop
  return source as Source<T, References, never, never>
}

type ControllerReceiver<Finalization, Query> = {
  controller: Option<Controller<Finalization, Query>>
  consumers?: Set<ControllerReceiver<Finalization, Query>>,
  id: string
}

export async function propagateController<Finalization, Query>(
  component: ControllerReceiver<Finalization, Query>,
  controller: Controller<Finalization, Query>
) {
  if (isNone(component.controller)) {
    component.controller = some(controller)

    if (component.consumers) {
      forEachIterable(
        component.consumers,
        receiver => propagateController(
          receiver,
          controller
        )
      )
    }
  } else {
    const existingController = component.controller.value

    if (existingController !== controller) {
      throw new Error(`Tried to propagate controller ${controller.id} to component ${component.id} but it had already received controller ${controller.id}. A component may only have one controller during its lifecycle.`)
    } else {
      // Controller already set by another path, no-op
    }
  }
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
          async c => {
            consume(source, c, event)
          }
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
    const emitToSource = (e: BareSourceEmitted<T>) => {
      tick(source.clock)
      emit(
        source,
        bareSourceEmittedToEvent(
          e,
          source
        )
      )
    }

    source.lifecycle.state = "ACTIVE"
    const references = source.prototype.open(emitToSource)
    source.references = some(references)
  } else {
    throw new Error(`Attempted action open() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function subscribe<T, Finalization, Query>(
  source: SourceInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  if (source.lifecycle.state !== "ENDED") {
    if (source.lifecycle.state === "READY") {
      open(source)
    }

    source.consumers.add(consumer)

    if (isSome(source.controller)) {
      propagateController(
        consumer,
        source.controller.value
      )
    }
  } else {
    throw new Error(`Attempted action subscribe() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function sealEvent<Query>(
  source: SourceInstance<any, any, any, Query>,
  q?: QueryState<Query>
): MetaEvent<Query> {
  tick(source.clock)

  return {
    type: "SEAL",
    cause: fromNullable(q),
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

    forEachIterable(
      source.consumers,
      consumer => consume(
        source,
        consumer,
        sealEvent(source, query)
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
      // TODO need a close function that operates on a generic consumer,
      // but delegates to either the Sink or Derivation implementations.
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
