import {
  BroadEvent,
  CoreEvent,
  Outcome,
  Sink
} from '@/types/abstract'
import { SinkInstance, GenericEmitterInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { isSome, map, none, some } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'
import { pipe } from 'fp-ts/lib/pipeable'

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

export function initializeSinkInstance<T, References,>(sink: Sink<T, References>, emitterInstance: GenericEmitterInstance<T, any>, { id }: { id?: string } = {}): SinkInstance<T, References> {
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
    // TODO does a sink need an explicit reference to its source?
    // Maybe not!
    source: emitterInstance,
    references: some(sink.open()),
    controller: none,
    id: tag
  }
}

export async function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  sink: SinkInstance<T, any>,
  e: BroadEvent<T>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just record the receipt of any event tags.
    } else if (e.type === "SEAL") {
      const result = await sink.prototype.seal(sink.references)

      // TODO Same logic in other graph components
      pipe(
        sink.controller,
        map(
          controller => controller.seal({
            graphComponentType: sink.prototype.graphComponentType,
            instance: sink,
            result
          })
        )
      )
    } else {
      const references = getSome(sink.references)
      await sink.prototype.consume(e as CoreEvent<T>, references)
    }
  } else {
    throw new Error(`Attempted action consume() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function close<T, References, Finalization>(
  source: GenericEmitterInstance<T, References>,
  sink: SinkInstance<T, References>,
  outcome: Outcome<T, Finalization>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    const references = getSome(sink.references)

    await sink.prototype.close(references, outcome)
    sink.references = none
  } else {
    throw new Error(`Attempted action close() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}
