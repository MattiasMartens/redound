import { voidPromiseIterable } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  BareSourceEmitted,
  Derivation,
  Event,
  MetaEvent,
  Outcome,
  QueryState,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller, DerivationInstance } from '@/types/instances'
import {
  noop
} from '@/patterns/functions'
import { isNone, isSome, Option, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock, tick } from './clock'
import { consume, close as consumerClose } from './consumer'
import { bareSourceEmittedToEvent } from './events'
import { initializeTag } from './tags'
import { propagateController } from './controller'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleDerivation<T, References>(derivation: Omit<Derivation<T, References, never, never>, "graphComponentType" | "sourceCapability">) {
  return Object.assign(
    derivation,
    {
      sourceCapability: none,
      graphComponentType: "Derivation"
    }
  ) as Derivation<T, References, never, never>
}

type SourceId = string
type DerivationRole = string
export function initializeDerivationInstance<T, Member, Finalization, Query>(derivation: Derivation<T, Member, Finalization, Query>, sources: {
  numbered: SourceId[],
  named: Map<DerivationRole, SourceId>
}, { id }: { id?: string } = {}): DerivationInstance<T, Member, Finalization, Query> {
  const tag = initializeTag(
    derivation.name,
    id
  )

  return {
    prototype: derivation,
    lifecycle: {
      state: "READY"
    },
    member: none,
    consumers: new Set(),
    backpressure: none,
    controller: none,
    latestTickByProvenance: new Map(),
    sourcesByRole: sources,
    id: tag
  }
}

// TODO Some of this logic may be mergeable with a source's emit()
export async function emit<T, References, Finalization, Query>(
  derivation: DerivationInstance<T, References, Finalization, Query>,
  event: Event<T, Query> | MetaEvent<Query>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    if (isSome(derivation.backpressure)) {
      await derivation.backpressure.value
    }

    derivation.backpressure = some(
      voidPromiseIterable(
        mapIterable(
          derivation.consumers,
          async c => {
            consume(derivation, c, event)
          }
        )
      ).then(() => void (derivation.backpressure = none))
    )
  } else {
    throw new Error(`Attempted action emit() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}
