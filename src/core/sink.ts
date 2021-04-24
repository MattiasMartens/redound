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
import { defer } from '@/patterns/async'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References, SinkResult>(sink: Omit<Sink<T, References, SinkResult>, 'graphComponentType'>) {
  // @ts-ignore
  sink.graphComponentType = "Sink"
  return Object.assign(
    sink,
    {
      graphComponentType: "Sink"
    }
  ) as Sink<T, References, SinkResult>
}

export function instantiateSink<T, References, SinkResult>(sink: Sink<T, References, SinkResult>, { id }: { id?: string } = {}): SinkInstance<T, References, SinkResult> {
  const tag = initializeTag(
    sink.name,
    id
  )

  const sinkResult = defer<SinkResult>()

  const sinkInstance = {
    prototype: sink,
    latestTickByProvenance: new Map(),
    lifecycle: {
      state: "ACTIVE"
    },
    references: some(sink.open()),
    controller: none,
    sinkResult: () => sinkResult.promise,
    async seal() {
      const result = await sinkInstance.prototype.seal(
        getSome(sinkInstance.references)
      )
      sinkResult.resolve(result)
      sinkInstance.lifecycle = { state: "SEALED" }

      // TODO Same logic in other graph components
      await pipe(
        sinkInstance.controller,
        fold(
          noopAsync,
          controller => controller.seal({
            graphComponentType: sinkInstance.prototype.graphComponentType,
            instance: sinkInstance,
            result
          })
        )
      )
    },
    id: tag
  } as SinkInstance<T, References, SinkResult>

  return sinkInstance
}

export async function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  sink: SinkInstance<T, any, any>,
  event: T | ControlEvent
) {
  if (sink.lifecycle.state === "ACTIVE") {
    if (event === EndOfTagEvent) {
      // TODO
      throw new Error("Not implemented")
    } else if (event === SealEvent) {
      await sink.seal()
    } else {
      const references = getSome(sink.references)
      try {
        await sink.prototype.consume(event as T, references)
      } catch (e) {
        await pipe(
          sink.controller,
          fold(
            async () => {
              // TODO Error is suppressed but the programmer should still be notified somehow?
            },
            c => c.rescue(
              e,
              some(event),
              sink
            )
          )
        )
      }
    }
  } else {
    throw new Error(`Attempted action consume() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function close<T, References, Finalization>(
  sink: SinkInstance<T, References, any>,
  outcome: Outcome<T, Finalization>
) {
  if (sink.lifecycle.state !== "ENDED") {
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
