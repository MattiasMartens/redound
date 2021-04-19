import {
  BroadEvent,
  CoreEvent,
  Outcome,
  Sink
} from '@/types/abstract'
import { SinkInstance, GenericEmitterInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { none, some } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References>(sink: Omit<Sink<T, References, never>, 'graphComponentType'>) {
  // @ts-ignore
  sink.graphComponentType = "Sink"
  return Object.assign(
    sink,
    {
      graphComponentType: "Sink"
    }
  ) as Sink<T, References, never>
}

export function initializeSinkInstance<T, References, Finalization>(sink: Sink<T, References, Finalization>, emitterInstance: GenericEmitterInstance<T, any, Finalization>, { id }: { id?: string } = {}): SinkInstance<T, References, Finalization> {
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

export async function consume<T, MemberOrReferences, Finalization>(
  source: GenericEmitterInstance<T, MemberOrReferences, Finalization>,
  sink: SinkInstance<T, any, Finalization>,
  e: BroadEvent<T>
) {
  if (sink.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just update the sink's provenance clock.
    } else if (e.type === "SEAL") {
      // also no-op: The sink doesn't care about this, at least until it triggers
      // the controller to close it.
    } else {
      const references = getSome(sink.references)
      await sink.prototype.consume(e as CoreEvent<T>, references)
    }
  } else {
    throw new Error(`Attempted action consume() on sink ${sink.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export async function close<T, References, Finalization>(
  source: GenericEmitterInstance<T, References, Finalization>,
  sink: SinkInstance<T, References, Finalization>,
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
