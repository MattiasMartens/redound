import { voidPromiseIterable } from '@/patterns/async'
import { filterIterable, forEachIterable, mapIterable, tapIterable, without } from '@/patterns/iterables'
import {
  BareDerivationEmitted,
  BroadEvent,
  Derivation,
  Event,
  MetaEvent,
  Outcome,
  QueryState
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, DerivationInstance, GenericEmitterInstance, SinkInstance } from '@/types/instances'
import { isSome, some } from 'fp-ts/lib/Option'
import { none } from 'fp-ts/lib/Option'
import { close as consumerClose } from './consumer'
import { bareDerivationEmittedToEvent } from './events'
import {
  consume as sinkConsume
} from './sink'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { createSetFromNullable } from '@/patterns/sets'
import { getSome } from '@/patterns/options'
import { mapCollectInto, reconcileFold } from 'big-m'
import { identity } from '@/patterns/functions'

export function* allSources(sourcesByRole: DerivationInstance<any, any, any, any>["sourcesByRole"]) {
  for (const [source] of sourcesByRole.named) {
    yield source
  }

  yield* sourcesByRole.numbered
}

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

export function initializeDerivationInstance<T, Member, Finalization, Query>(derivation: Derivation<T, Member, Finalization, Query>, sources: DerivationInstance<any, any, any, any>["sourcesByRole"], { id }: { id?: string } = {}): DerivationInstance<T, Member, Finalization, Query> {
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
    sealedSources: new Set(
      filterIterable(
        allSources(sources),
        s => !["SEALED", "ENDED"].includes(s.lifecycle.state)
      )
    ),
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
            return genericConsume(derivation, c, event)
          }
        )
      ).then(() => void (derivation.backpressure = none))
    )
  } else {
    throw new Error(`Attempted action emit() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function open<T, Member, Finalization, Query>(
  derivation: DerivationInstance<T, Member, Finalization, Query>
) {
  if (derivation.lifecycle.state === "READY") {
    derivation.lifecycle.state = "ACTIVE"
    const member = derivation.prototype.open()
    derivation.member = some(member)
  } else {
    throw new Error(`Attempted action open() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function subscribe<T, Finalization, Query>(
  derivation: DerivationInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>,
  openSource: (s: SourceInstance<any, any, any, any>) => void
) {
  if (derivation.lifecycle.state !== "ENDED") {
    if (derivation.lifecycle.state === "READY") {
      siphon(derivation, openSource)
    }

    derivation.consumers.add(consumer)

    if (isSome(derivation.controller)) {
      propagateController(
        consumer,
        derivation.controller.value
      )
    }
  } else {
    throw new Error(`Attempted action subscribe() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function siphon(derivation: DerivationInstance<any, any, any, any>, openSource: (source: SourceInstance<any, any, any, any>) => void) {
  forEachIterable(
    allSources(derivation.sourcesByRole),
    genericEmitter => {
      if (genericEmitter.prototype.graphComponentType === "Derivation" && genericEmitter.lifecycle.state === "READY") {
        open(derivation)
        siphon(genericEmitter as DerivationInstance<any, any, any, any>, openSource)
      } else if (genericEmitter.prototype.graphComponentType === "Source" && genericEmitter.lifecycle.state === "READY") {
        openSource(genericEmitter as SourceInstance<any, any, any, any>)
      }
    }
  )
}

export function sealEvent<Query>(
  sourceEvent: MetaEvent<Query>,
  q?: QueryState<Query>
): MetaEvent<Query> {
  return {
    type: "SEAL",
    cause: createSetFromNullable(q),
    provenance: sourceEvent.provenance
  }
}

export function unsubscribe<T, Finalization, Query>(
  source: SourceInstance<T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>
) {
  source.consumers.delete(consumer)
}

export function seal<T, Member, Finalization, Query>(
  derivation: DerivationInstance<T, Member, Finalization, Query>,
  event: MetaEvent<Query>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    derivation.lifecycle.state = "SEALED"

    forEachIterable(
      derivation.consumers,
      consumer => genericConsume(
        derivation,
        consumer,
        event
      )
    )
  } else if (derivation.lifecycle.state === "ENDED") {
    // no-op
  } else {
    throw new Error(`Attempted action seal() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function close<T, References, Finalization, Query>(
  derivation: DerivationInstance<T, References, Finalization, Query>,
  outcome: Outcome<T, Finalization, Query>
) {
  if (derivation.lifecycle.state !== "ENDED" && derivation.lifecycle.state !== "READY") {
    derivation.lifecycle = {
      outcome,
      state: "ENDED"
    }

    forEachIterable(
      derivation.consumers,
      consumer => consumerClose(
        derivation,
        consumer,
        outcome
      )
    )
  } else {
    throw new Error(`Attempted action close() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

// Copied from consumer.ts to avoid a dependency loop.
function genericConsume<T, MemberOrReferences, Finalization, Query>(
  emitter: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>,
  event: Event<T, Query> | MetaEvent<Query>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    return sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences, Finalization, Query>,
      event
    )
  } else {
    return consume(
      emitter,
      consumer as DerivationInstance<T, MemberOrReferences, Finalization, Query>,
      event
    )
  }
}

export async function consume<T, MemberOrReferences, Finalization, Query>(
  source: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
  derivation: DerivationInstance<T, any, Finalization, Query>,
  e: BroadEvent<T, Query>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just update the sink's provenance clock.
    } else if (e.type === "SEAL") {
      derivation.sealedSources.add(source)

      const derivationEmit = (e: BareDerivationEmitted<T>) => {
        emit(
          derivation,
          bareDerivationEmittedToEvent(
            e
          )
        )
      }

      const willSeal = await derivation.prototype.seal({
        member: getSome(derivation.member),
        emit: derivationEmit,
        remainingUnsealedSources: new Set(
          without(
            allSources(derivation.sourcesByRole),
            derivation.sealedSources
          )
        )
      })

      if (willSeal) {
        seal(derivation, e)
      }
    } else {
      const member = getSome(derivation.member)

      const derivationEmit = (e: BareDerivationEmitted<T>) => {
        emit(
          derivation,
          bareDerivationEmittedToEvent(
            e
          )
        )
      }

      await derivation.prototype.consume({
        event: e as Event<T, Query>,
        emit: derivationEmit,
        member,
        source
      })
    }

    mapCollectInto(
      e.provenance,
      derivation.latestTickByProvenance,
      reconcileFold(
        identity,
        (currentLatestTick, incomingTick) => {
          if (incomingTick >= currentLatestTick) {
            return incomingTick
          } else {
            throw new Error(`Events may not arrive to a consumer out of order`)
          }
        }
      )
    )
  } else {
    throw new Error(`Attempted action consume() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}
