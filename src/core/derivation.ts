import { iterateOverAsyncResult, voidPromiseIterable } from '@/patterns/async'
import { filterIterable, forEachIterable, mapIterable, without } from '@/patterns/iterables'
import {
  Derivation,
  Outcome
} from '@/types/abstract'
import { PossiblyAsyncResult } from "@/patterns/async"
import { SourceInstance, GenericConsumerInstance, DerivationInstance, GenericEmitterInstance, SinkInstance, Emitter } from '@/types/instances'
import { fold, isSome, map, some } from 'fp-ts/lib/Option'
import { none, Option } from 'fp-ts/lib/Option'
import { close as consumerClose } from './consumer'
import {
  consume as sinkConsume
} from './sink'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { getSome } from '@/patterns/options'
import { applyToBackpressure, backpressure } from './backpressure'
import { ControlEvent, EndOfTagEvent, SealEvent } from '@/types/events'
import { Either, left } from 'fp-ts/lib/Either'
import { pipe } from 'fp-ts/lib/function'
import { noop } from '@/patterns/functions'
import { defaultDerivationSeal } from './helpers'
import { Possible } from '@/types/patterns'
import { defined } from '@/patterns/insist'

export function* allSources(derivation: Record<string, Emitter<any>>) {
  for (const role in derivation) {
    yield derivation[role]
  }
}

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleDerivation<SourceType extends Record<string, Emitter<any>>, T, References>(derivation: Partial<Omit<Derivation<SourceType, T, References>, "graphComponentType" | "derivationSpecies">>) {
  return Object.assign(
    {
      derivationSpecies: "Transform",
      graphComponentType: "Derivation",
      close: noop,
      consume: ({ aggregate }) => ({ aggregate }),
      consumes: {},
      emits: new Set(),
      name: "AnonymousDerivation",
      open: noop,
      seal: defaultDerivationSeal,
      querySeal: ({ aggregate }) => ({
        aggregate, seal: false
      }),
      unroll: noop
    } as Derivation<SourceType, T, References>,
    derivation
  ) as Derivation<SourceType, T, References>
}

export function instantiateDerivation<SourceType extends Record<string, Emitter<any>>, T, Aggregate>(derivation: Derivation<SourceType, T, Aggregate>, sources: SourceType, { id }: { id?: string } = {}): DerivationInstance<SourceType, T, Aggregate> {
  const tag = initializeTag(
    derivation.name,
    id
  )

  if (derivation.derivationSpecies === "Relay") {
    throw new Error("Not implemented")
  }

  return {
    prototype: derivation,
    derivationSpecies: derivation.derivationSpecies,
    lifecycle: {
      state: "READY"
    },
    aggregate: none,
    consumers: new Set(),
    backpressure: backpressure(),
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
  event: T | ControlEvent,
  tag: Possible<string>
) {
  // Derivations *can* emit events after they have
  // been sealed! New consumers can still query the Derivation's
  // existing aggregated data, unless and until the graph is
  // finally closed.
  if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
    return applyToBackpressure(
      derivation.backpressure,
      () => voidPromiseIterable(
        mapIterable(
          derivation.consumers,
          async c => genericConsume(derivation, c, event, tag)
        )
      )
    )
  } else {
    throw new Error(`Attempted action emit() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export async function scheduleEmissions<T, References>(
  derivation: DerivationInstance<any, T, References>,
  result: PossiblyAsyncResult<T>,
  tag: Possible<string>
) {
  if (derivation.lifecycle.state === "ACTIVE" || derivation.lifecycle.state === "SEALED") {
    if (derivation.prototype.derivationSpecies === "Relay") {
      // TODO
      throw new Error("Not implemented")
    }

    return applyToBackpressure(
      derivation.backpressure,
      () => iterateOverAsyncResult(
        result,
        e => voidPromiseIterable(
          mapIterable(
            derivation.consumers,
            async c => genericConsume(derivation, c, e, tag),
          )
        ),
        () => derivation.lifecycle.state === "ENDED"
      )
    )
  } else {
    throw new Error(`Attempted action scheduleEmissions() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function open<SourceType extends Record<string, Emitter<any>>, T, Aggregate>(
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
      } else if (genericEmitter.prototype.graphComponentType === "Source" && genericEmitter.lifecycle.state === "READY") {
        sourceSubscribe(genericEmitter as SourceInstance<any, any>, derivation)
      }
    }
  )
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
  event: T | ControlEvent,
  tag: Possible<string>
) {
  if (consumer.prototype.graphComponentType === "Sink") {
    return sinkConsume(
      emitter,
      consumer as SinkInstance<T, MemberOrReferences, any>,
      event,
      tag
    )
  } else {
    return consume(
      emitter,
      consumer as DerivationInstance<any, any, MemberOrReferences>,
      event,
      tag
    )
  }
}

export function seal<Aggregate>(
  derivation: DerivationInstance<any, any, Aggregate>,
  event: ControlEvent
) {
  if (derivation.lifecycle.state === "ACTIVE") {
    if (derivation.prototype.derivationSpecies === "Relay") {
      throw new Error("Not implemented")
    }

    derivation.lifecycle.state = "SEALED"
    return voidPromiseIterable(
      mapIterable(
        derivation.consumers,
        consumer => genericConsume(
          derivation,
          consumer,
          event,
          undefined
        )
      )
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
      consumer => consumer.lifecycle.state !== "ENDED" && consumerClose(
        consumer,
        outcome
      )
    )
  } else {
    throw new Error(`Attempted action close() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

function getSourceRole<SourceType extends Record<string, Emitter<any>>>(derivation: DerivationInstance<SourceType, any, any>, source: GenericEmitterInstance<any, any>) {
  for (const role in derivation.sourcesByRole) {
    if (derivation.sourcesByRole[role] === source) {
      return role
    }
  }

  throw new Error(`Emitter ${source.id} yielded event to derivation ${derivation.id} but no role had been registered for that emitter`)
}

const defaultCapabilities = {
  push: () => left(new Error("No controller present, so push not supported")),
  pull: () => left(new Error("No controller present, so pull not supported"))
}

function remainingUnsealedSources(derivation: DerivationInstance<any, any, any>) {
  return new Set(
    without(
      allSources(derivation.sourcesByRole),
      derivation.sealedSources
    )
  )
}

async function derivationTry<T>(
  fn: () => Promise<T>,
  derivation: DerivationInstance<any, any, any>,
  event: Option<any | ControlEvent>
) {
  try {
    return await fn()
  } catch (e) {
    return pipe(
      derivation.controller,
      fold(
        () => {
          console.error(`Uncaught error from Derivation with no controller: ${derivation.id}. Error:
          ${e}
          
          To prevent errors from being logged, add Derivation ${derivation.id} to a graph with a controller.`)
        },
        c => c.rescue(e, event, derivation)
      )
    )
  }
}

export function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  derivation: DerivationInstance<any, any, any>,
  e: T | ControlEvent,
  tag: Possible<string>
) {
  return derivationTry(
    async () => {
      if (derivation.lifecycle.state === "ACTIVE") {
        if (e === EndOfTagEvent) {
          // 1. Call derivation's implementation of querySeal
          const querySealResult = derivation.prototype.querySeal({
            aggregate: getSome(derivation.aggregate),
            source,
            tag: defined(tag, "Received EndOfTagEvent with no attendant tag"),
            remainingUnsealedSources: remainingUnsealedSources(derivation),
            role: getSourceRole(derivation, source)
          })

          if ("aggregate" in querySealResult) {
            derivation.aggregate = some(querySealResult.aggregate)
          }

          if ("output" in querySealResult) {
            await scheduleEmissions(
              derivation,
              querySealResult.output,
              tag
            )
          }

          if (querySealResult.seal) {
            seal(derivation, SealEvent)
          }

          // 2. Notify controller
          pipe(
            derivation.controller,
            map(
              c => c.taggedEvent(e, defined(tag, "Received EndOfTagEvent without a tag argument"), derivation)
            )
          )
        } else if (e === SealEvent) {
          derivation.sealedSources.add(source)
          const sealResult = derivation.prototype.seal({
            aggregate: getSome(derivation.aggregate),
            source,
            role: getSourceRole(
              derivation,
              source
            ),
            remainingUnsealedSources: remainingUnsealedSources(derivation)
          })

          if ("aggregate" in sealResult) {
            derivation.aggregate = some(sealResult.aggregate)
          }

          await scheduleEmissions(
            derivation,
            sealResult.output,
            tag
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
            event: e,
            tag,
            aggregate: inAggregate,
            source,
            role,
            capabilities: pipe(
              derivation.controller,
              fold(
                () => defaultCapabilities,
                c => c.capabilities
              )
            )
          })

          derivation.aggregate = some(
            outAggregate
          )

          await scheduleEmissions(
            derivation,
            output,
            tag
          )
        }
      } else {
        throw new Error(`Attempted action consume() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
      }
    }, derivation, some(e))
}
