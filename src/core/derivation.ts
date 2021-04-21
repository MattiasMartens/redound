import { twoStepIterateOverAsyncResult, voidPromiseIterable } from '@/patterns/async'
import { filterIterable, forEachIterable, mapIterable, tapIterable, without } from '@/patterns/iterables'
import {
  BroadEvent,
  Derivation,
  CoreEvent,
  MetaEvent,
  Outcome,
  DerivationEmission,
  Event
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, DerivationInstance, GenericEmitterInstance, SinkInstance, EmitterInstanceAlias } from '@/types/instances'
import { isSome, some } from 'fp-ts/lib/Option'
import { none } from 'fp-ts/lib/Option'
import { close as consumerClose } from './consumer'
import {
  consume as sinkConsume
} from './sink'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { createSetFromNullable } from '@/patterns/sets'
import { getSome } from '@/patterns/options'
import { mapCollectInto, reconcileFold } from 'big-m'
import { identity } from '@/patterns/functions'
import { applyToBackpressure, backpressure } from './backpressure'

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
export function declareSimpleDerivation<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, References>(derivation: Omit<Derivation<SourceType, T, References>, "graphComponentType" | "sourceCapability">) {
  return Object.assign(
    derivation,
    {
      sourceCapability: none,
      graphComponentType: "Derivation"
    }
  ) as Derivation<SourceType, T, References>
}

export function instantiateDerivation<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate>(derivation: Derivation<any, T, Aggregate>, sources: SourceType, { id }: { id?: string } = {}): DerivationInstance<SourceType, T, Aggregate> {
  const tag = initializeTag(
    derivation.name,
    id
  )

  return {
    prototype: derivation,
    lifecycle: {
      state: "READY"
    },
    aggregate: none,
    consumers: new Set(),
    downstreamBackpressure: backpressure(),
    innerBackpressure: backpressure(),
    controller: none,
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

export async function emit<T, References>(
  derivation: DerivationInstance<any, T, References>,
  event: CoreEvent<T> | MetaEvent
) {
  // Derivations *can* emit events after they have
  // been sealed! New consumers can still query the Derivation's
  // existing aggregated data, unless and until the graph is
  // finally closed.
  if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
    return applyToBackpressure(
      derivation.downstreamBackpressure,
      () => voidPromiseIterable(
        mapIterable(
          derivation.consumers,
          async c => genericConsume(derivation, c, event)
        )
      )
    )
  } else {
    throw new Error(`Attempted action emit() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export async function scheduleEmissions<T, References>(
  derivation: DerivationInstance<any, T, References>,
  result: DerivationEmission<T>,
  sourceEvent?: BroadEvent<T>
) {
  if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
    applyToBackpressure(
      derivation.downstreamBackpressure,
      async () => {
        const primaryEvents: Event<T>[] = []
        const {
          secondaryConsume
        } = await twoStepIterateOverAsyncResult(
          result,
          e => {
            primaryEvents.push(e)
          }
        )

        if (derivation.innerBackpressure.holder) {
          // If secondary generation is occurring, don't wait
          // for it to finish; just deposit the next events
          // on the emission queue and resolve.
          applyToBackpressure(
            derivation.innerBackpressure,
            () => Promise.all(primaryEvents.map(e => emit(derivation, e)))
          )
        } else {
          // If secondary generation is not occurring, apply
          // backpressure on emissions as one normally would.
          await applyToBackpressure(
            derivation.innerBackpressure,
            () => Promise.all(primaryEvents.map(e => {
              // Skip emit() to avoid deadlock from waiting for
              // own Promise to resolve
              return voidPromiseIterable(
                mapIterable(
                  derivation.consumers,
                  async c => genericConsume(derivation, c, e)
                )
              )
            }))
          )
        }

        if (secondaryConsume) {
          applyToBackpressure(
            derivation.innerBackpressure,
            () => secondaryConsume(
              e => emit(derivation, e)
            )
          )
        }
      }
    )
  } else {
    throw new Error(`Attempted action scheduleEmissions() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function open<SourceType extends Record<string, EmitterInstanceAlias<any>>, T, Aggregate>(
  derivation: DerivationInstance<SourceType, T, Aggregate>
) {
  if (derivation.lifecycle.state === "READY") {
    derivation.lifecycle.state = "ACTIVE"
    const aggregate = derivation.prototype.open()
    derivation.aggregate = some(aggregate)
  } else {
    throw new Error(`Attempted action open() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function subscribe<T>(
  derivation: DerivationInstance<any, T, any>,
  consumer: GenericConsumerInstance<T, any>,
  sourceSubscribe: (source: SourceInstance<any, any>, derivation: DerivationInstance<any, any, any>) => void
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

export function siphon(derivation: DerivationInstance<any, any, any>, sourceSubscribe: (source: SourceInstance<any, any>, derivation: DerivationInstance<any, any, any>) => void) {
  open(derivation)

  forEachIterable(
    allSources(derivation.sourcesByRole),
    genericEmitter => {
      if (genericEmitter.prototype.graphComponentType === "Derivation" && genericEmitter.lifecycle.state === "READY") {
        subscribe(genericEmitter as DerivationInstance<any, any, any>, derivation, sourceSubscribe)
        siphon(genericEmitter as DerivationInstance<any, any, any>, sourceSubscribe)
      } else if (genericEmitter.prototype.graphComponentType === "Source" && genericEmitter.lifecycle.state === "READY") {
        sourceSubscribe(genericEmitter as SourceInstance<any, any>, derivation)
      }
    }
  )
}

export function sealEvent(
  sourceEvent: MetaEvent
): MetaEvent {
  return {
    type: "SEAL"
  }
}

export function unsubscribe<T>(
  source: SourceInstance<T, any>,
  consumer: GenericConsumerInstance<T, any>
) {
  source.consumers.delete(consumer)
}

// Copied from consumer.ts to avoid a dependency loop.
function genericConsume<T, MemberOrReferences>(
  emitter: GenericEmitterInstance<T, MemberOrReferences>,
  consumer: GenericConsumerInstance<T, any>,
  event: CoreEvent<T> | MetaEvent
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    return sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences>,
      event
    )
  } else {
    return consume(
      emitter,
      consumer as DerivationInstance<any, any, MemberOrReferences>,
      event
    )
  }
}

export function seal<Aggregate>(
  derivation: DerivationInstance<any, any, Aggregate>,
  event: MetaEvent
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    applyToBackpressure(
      derivation.innerBackpressure,
      () => {
        derivation.lifecycle.state = "SEALED"
        return voidPromiseIterable(
          mapIterable(
            derivation.consumers,
            consumer => genericConsume(
              derivation,
              consumer,
              event
            )
          )
        )
      }
    )
  } else if (derivation.lifecycle.state === "ENDED") {
    // no-op
  } else {
    throw new Error(`Attempted action seal() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

type Finalization = any
export function close<References>(
  derivation: DerivationInstance<any, any, References>,
  outcome: Outcome<any, Finalization>
) {
  if (derivation.lifecycle.state !== "ENDED" && derivation.lifecycle.state !== "READY") {
    derivation.lifecycle = {
      outcome,
      state: "ENDED"
    }

    forEachIterable(
      derivation.consumers,
      consumer => consumerClose(
        consumer,
        outcome
      )
    )
  } else {
    throw new Error(`Attempted action close() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

function getSourceRole<SourceType extends Record<string, EmitterInstanceAlias<any>>>(derivation: DerivationInstance<SourceType, any, any>, source: GenericEmitterInstance<any, any>) {
  for (const role in derivation.sourcesByRole) {
    if (derivation.sourcesByRole[role] === source) {
      return role
    }
  }

  throw new Error(`Emitter ${source.id} yielded event to derivation ${derivation.id} but no role had been registered for that emitter`)
}


export async function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  derivation: DerivationInstance<any, any, any>,
  e: BroadEvent<T>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    if (e.type === "VOID") {
      // no-op: just update the sink's provenance clock.
    } else if (e.type === "SEAL") {
      derivation.sealedSources.add(source)
      const sealResult = derivation.prototype.seal({
        aggregate: getSome(derivation.aggregate),
        remainingUnsealedSources: new Set(
          without(
            allSources(derivation.sourcesByRole),
            derivation.sealedSources
          )
        )
      })

      derivation.aggregate = some(sealResult.aggregate)

      await scheduleEmissions(
        derivation,
        sealResult.output
      )

      if (sealResult.seal) {
        seal(derivation, e)
      }
    } else {
      const inAggregate = getSome(derivation.aggregate)

      const role = getSourceRole(
        derivation,
        source
      )

      const {
        aggregate: outAggregate,
        output
      } = derivation.prototype.consume({
        event: e as CoreEvent<any>,
        aggregate: inAggregate,
        source,
        role
      })

      derivation.aggregate = some(
        outAggregate
      )

      await scheduleEmissions(
        derivation,
        output
      )
    }
  } else {
    throw new Error(`Attempted action consume() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}
