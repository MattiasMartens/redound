import {
  Outcome,
  Sink
} from '@/types/abstract'
import { SinkInstance, GenericEmitterInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { fold, none, some } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'
import { noopAsync } from '@/patterns/functions'
import { pipe } from 'fp-ts/lib/function'
import { ControlEvent, SealEvent, EndOfTagEvent } from '@/types/events'
import { map } from 'fp-ts/lib/Option'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References>(sink: Omit<Sink<T, References>, 'graphComponentType'>) {
  // @ts-ignore
  sink.graphComponentType = "Sink"
  return Object.assign(
    sink,
    {
      graphComponentType: "Sink"
    }
  ) as Sink<T, References>
}

export function instantiateSink<T, References,>(sink: Sink<T, References>, emitterInstance: GenericEmitterInstance<T, any>, { id }: { id?: string } = {}): SinkInstance<T, References> {
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
    references: some(sink.open()),
    controller: none,
    id: tag
  }
}

export async function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  sink: SinkInstance<T, any>,
  e: T | ControlEvent
) {
  if (sink.lifecycle.state === "ACTIVE") {
    if (e === EndOfTagEvent) {
      // TODO
      throw new Error("Not implemented")
    } else if (e === SealEvent) {
      const result = await sink.prototype.seal(
        getSome(sink.references)
      )
      sink.lifecycle = { state: "SEALED" }

      // TODO Same logic in other graph components
      await pipe(
        sink.controller,
        fold(
          noopAsync,
          controller => controller.seal({
            graphComponentType: sink.prototype.graphComponentType,
            instance: sink,
            result
          })
        )
      )
    } else {
      const references = getSome(sink.references)
      await sink.prototype.consume(e as T, references)
    }
  } else {
    throw new Error(`Attempted action consume() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function close<T, References, Finalization>(
  sink: SinkInstance<T, References>,
  outcome: Outcome<T, Finalization>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    const references = getSome(sink.references)

    await sink.prototype.close(references, outcome)
    sink.references = none
    sink.lifecycle = {
      state: "ENDED",
      outcome
    }
    pipe(
      sink.controller,
      map(
        c => c.close(sink)
      )
    )
  } else {
    throw new Error(`Attempted action close() on sink ${sink.id} in incompatible lifecycle state: ${sink.lifecycle.state}`)
  }
}
