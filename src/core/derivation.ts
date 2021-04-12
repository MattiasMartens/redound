import { voidPromiseIterable } from '@/patterns/async'
import { filterIterable, forEachIterable, mapIterable, tapIterable, without } from '@/patterns/iterables'
import {
  DerivationEvent,
  BroadEvent,
  Derivation,
  CoreEvent,
  MetaEvent,
  Outcome,
  QueryState
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, DerivationInstance, GenericEmitterInstance, SinkInstance, EmitterInstanceAlias } from '@/types/instances'
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

export function* allSources(derivation: Record<string, EmitterInstanceAlias<any>>) {
  for (const role in derivation) {
    yield derivation[role]
  }
}

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleDerivation<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, References>(derivation: Omit<Derivation<SourceType, T, References, never, never>, "graphComponentType" | "sourceCapability">) {
  return Object.assign(
    derivation,
    {
      sourceCapability: none,
      graphComponentType: "Derivation"
    }
  ) as Derivation<SourceType, T, References, never, never>
}

export function initializeDerivationInstance<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, Member, Finalization, Query>(derivation: Derivation<any, T, Member, Finalization, Query>, sources: SourceType, { id }: { id?: string } = {}): DerivationInstance<SourceType, T, Member, Finalization, Query> {
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
        s => ["SEALED", "ENDED"].includes(s.lifecycle.state)
      )
    ),
    id: tag
  }
}

// TODO Some of this logic may be mergeable with a source's emit()
export async function emit<T, References, Finalization, Query>(
  derivation: DerivationInstance<any, T, References, Finalization, Query>,
  event: CoreEvent<T, Query> | MetaEvent<Query>
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

export function open<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, Member, Finalization, Query>(
  derivation: DerivationInstance<SourceType, T, Member, Finalization, Query>
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
  derivation: DerivationInstance<any, T, any, Finalization, Query>,
  consumer: GenericConsumerInstance<T, any, Finalization, Query>,
  sourceSubscribe: (source: SourceInstance<any, any, any, any>, derivation: DerivationInstance<any, any, any, any, any>) => void
) {
  if (derivation.lifecycle.state !== "ENDED") {
    derivation.consumers.add(consumer)

    if (derivation.lifecycle.state === "READY") {
      if (isSome(derivation.controller)) {
        propagateController(
          consumer,
          derivation.controller.value
        )
      }

      siphon(derivation, sourceSubscribe)
    }
  } else {
    throw new Error(`Attempted action subscribe() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function siphon(derivation: DerivationInstance<any, any, any, any, any>, sourceSubscribe: (source: SourceInstance<any, any, any, any>, derivation: DerivationInstance<any, any, any, any, any>) => void) {
  open(derivation)

  forEachIterable(
    allSources(derivation.sourcesByRole),
    genericEmitter => {
      if (genericEmitter.prototype.graphComponentType === "Derivation" && genericEmitter.lifecycle.state === "READY") {
        subscribe(genericEmitter as DerivationInstance<any, any, any, any, any>, derivation, sourceSubscribe)
        siphon(genericEmitter as DerivationInstance<any, any, any, any, any>, sourceSubscribe)
      } else if (genericEmitter.prototype.graphComponentType === "Source" && genericEmitter.lifecycle.state === "READY") {
        sourceSubscribe(genericEmitter as SourceInstance<any, any, any, any>, derivation)
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

export function seal<Member, Finalization, Query>(
  derivation: DerivationInstance<any, any, Member, Finalization, Query>,
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

export function close<References, Finalization, Query>(
  derivation: DerivationInstance<any, any, References, Finalization, Query>,
  outcome: Outcome<any, Finalization, Query>
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
  event: CoreEvent<T, Query> | MetaEvent<Query>
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
      consumer as DerivationInstance<any, any, MemberOrReferences, Finalization, Query>,
      event
    )
  }
}

function getSourceRole<SourceType extends Record<string, EmitterInstanceAlias<any>>>(derivation: DerivationInstance<SourceType, any, any, any, any>, source: GenericEmitterInstance<any, any, any, any>) {
  for (const role in derivation.sourcesByRole) {
    if (derivation.sourcesByRole[role] === source) {
      return role
    }
  }

  throw new Error(`Emitter ${source.id} yielded event to derivation ${derivation.id} but no role had been registered for that emitter`)
}


export async function consume<T, MemberOrReferences, Finalization, Query>(
  source: GenericEmitterInstance<T, MemberOrReferences, Finalization, Query>,
  derivation: DerivationInstance<any, any, any, Finalization, Query>,
  e: BroadEvent<T, Query>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just update the sink's provenance clock.
    } else if (e.type === "SEAL") {
      derivation.sealedSources.add(source)

      const derivationEmit = (e: DerivationEvent<T>) => {
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

      const derivationEmit = (e: DerivationEvent<T>) => {
        emit(
          derivation,
          bareDerivationEmittedToEvent(
            e
          )
        )
      }

      const role = getSourceRole(
        derivation,
        source
      )

      await derivation.prototype.consume({
        event: e as CoreEvent<any, Query>,
        emit: derivationEmit,
        member,
        source,
        role
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
