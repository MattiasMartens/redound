import { iterateOverAsyncResult, voidPromiseIterable, wrapAsync } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  Outcome,
  Query,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, ControllerInstance } from '@/types/instances'
import {
  noop
} from '@/patterns/functions'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { consume, close as consumerClose } from './consumer'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { backpressure } from './backpressure'
import { pipe } from 'fp-ts/lib/function'
import { map } from 'fp-ts/lib/Option'
import { ControlEvent, SealEvent } from '@/types/events'
import { getSome } from '@/patterns/options'

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
export function declareSimpleSource<T, References>(source: Omit<Source<T, References>, "graphComponentType" | "pull">) {
  return Object.assign(
    source,
    {
      graphComponentType: "Source"
    }
  ) as Source<T, References>
}

export function instantiateSource<T, References>(source: Source<T, References>, { id, controller, role }: { id?: string, tick?: number, controller?: ControllerInstance<any>, role?: string } = {}): SourceInstance<T, References> {
  const tag = initializeTag(
    source.name,
    id
  )

  const controllerOption = fromNullable(controller)

  const sourceInstance = {
    prototype: source,
    lifecycle: {
      state: "READY"
    },
    consumers: new Set(),
    references: none,
    backpressure: backpressure(),
    controller: controllerOption,
    id: tag,
    pull: source.pull ? (
      async (query: Query) => {
        if (sourceInstance.lifecycle.state === "READY" || sourceInstance.lifecycle.state === "SEALED" || sourceInstance.lifecycle.state === "ENDED") {
          throw new Error(`Attempted action pull() on source ${id} in incompatible lifecycle state: ${sourceInstance.lifecycle.state}`)
        }

        const result = source.pull!(
          query,
          getSome(sourceInstance.references)
        )

        try {
          await iterateOverAsyncResult(
            result,
            event => voidPromiseIterable(
              mapIterable(
                sourceInstance.consumers,
                async c => consume(sourceInstance, c, event)
              )
            ),
            () => sourceInstance.lifecycle.state === "ENDED"
          )
        } catch (e) {
          pipe(
            sourceInstance.controller,
            map(
              c => c.rescue(e, none, sourceInstance)
            )
          )
        }
      }
    ) : undefined
  } as SourceInstance<T, References>

  pipe(
    controllerOption,
    map(
      controller => controller.registerSource(sourceInstance, role)
    )
  )

  return sourceInstance
}

export async function emit<T, References>(
  source: SourceInstance<T, References>,
  event: T | ControlEvent
) {
  if (source.lifecycle.state === "ACTIVE") {
    return voidPromiseIterable(
      mapIterable(
        source.consumers,
        async c => consume(source, c, event)
      )
    )
  } else {
    throw new Error(`Attempted action emit() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function open<T, References>(
  source: SourceInstance<T, References>
) {
  if (source.lifecycle.state === "READY") {
    const sourceEmit = (e: T | ControlEvent) => {
      return emit(
        source,
        e
      )
    }

    source.lifecycle.state = "ACTIVE"
    const {
      references,
      output
    } = source.prototype.generate()
    source.references = some(references as References)

    void (async () => {
      try {
        await iterateOverAsyncResult(
          output,
          sourceEmit,
          () => source.lifecycle.state === "ENDED"
        )

        if (!source.prototype.pull) {
          seal(source)
        }
      } catch (e) {
        pipe(
          source.controller,
          map(
            /**  NOTE: This captures failures *only* from the generation of events;emitting to a consumer is a can't-fail operation because if there were an error, the consumer would send it to the controller directly. It would never return to the control of this function. */
            c => c.rescue(e, none, source)
          )
        )
      }

    })()
  } else {
    throw new Error(`Attempted action open() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function subscribe<T>(
  source: SourceInstance<T, any>,
  consumer: GenericConsumerInstance<T, any>
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
      open(source)
    }
  } else {
    throw new Error(`Attempted action subscribe() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function unsubscribe<T>(
  source: SourceInstance<T, any>,
  consumer: GenericConsumerInstance<T, any>
) {
  source.consumers.delete(consumer)
}

export function seal<T, References>(
  source: SourceInstance<T, References>,
) {
  if (source.lifecycle.state === "ACTIVE") {
    source.lifecycle.state = "SEALED"

    forEachIterable(
      source.consumers,
      consumer => consume(
        source,
        consumer,
        SealEvent
      )
    )
  } else if (source.lifecycle.state === "ENDED") {
    // no-op
  } else {
    throw new Error(`Attempted action seal() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

type Finalization = any
export function close<T, References>(
  source: SourceInstance<T, References>,
  outcome: Outcome<T, Finalization>
) {
  if (source.lifecycle.state !== "ENDED" && source.lifecycle.state !== "READY") {
    source.lifecycle = {
      outcome,
      state: "ENDED"
    }

    forEachIterable(
      source.consumers,
      consumer => consumerClose(
        consumer,
        outcome
      )
    )
  } else {
    throw new Error(`Attempted action close() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}
