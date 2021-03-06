import { iterateOverAsyncResult, voidPromiseIterable } from '@/patterns/async'
import { filterIterable, forEachIterable, mapIterable, without } from '@/patterns/iterables'
import {
  Derivation,
  Outcome
} from '@/types/abstract'
import { PossiblyAsyncResult } from "@/patterns/async"
import { SourceInstance, GenericConsumerInstance, DerivationInstance, GenericEmitterInstance, SinkInstance, Emitter, ControllerInstance } from '@/types/instances'
import { fold, fromNullable, isSome, map, some } from 'fp-ts/lib/Option'
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
import { Either, left, right, map as mapRight, filterOrElse, flatten, mapLeft } from 'fp-ts/lib/Either'
import { identity, pipe } from 'fp-ts/lib/function'
import { noop } from '@/patterns/functions'
import { defaultDerivationSeal } from './helpers'
import { Possible } from '@/types/patterns'
import { defined } from '@/patterns/insist'
import { foldingGet, reconcileAdd, reconcileCount, reconcileEntryInto, reconcileFold } from 'big-m'
import { reconcileHashSet } from '@/sources/maps'
import { OneToManyBinMap } from '@/patterns/maps'

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
export function declareSimpleDerivation<SourceType extends Record<string, Emitter<any>>, T, References>(derivation: Partial<Omit<Derivation<SourceType, T, References>, "graphComponentType" | "derivationSpecies" | "open">>): Derivation<SourceType, T, undefined>
export function declareSimpleDerivation<SourceType extends Record<string, Emitter<any>>, T, References>(derivation: Partial<Omit<Derivation<SourceType, T, References>, "graphComponentType" | "derivationSpecies">>): Derivation<SourceType, T, References>
export function declareSimpleDerivation<SourceType extends Record<string, Emitter<any>>, T, References>(derivation: Partial<Omit<Derivation<SourceType, T, References>, "graphComponentType" | "derivationSpecies">>): Derivation<SourceType, T, References> {
  return Object.assign(
    {
      derivationSpecies: "Transform",
      graphComponentType: "Derivation",
      close: noop,
      consume: ({ aggregate }) => ({ aggregate }),
      consumes: {},
      emits: new Set(),
      name: "AnonymousDerivation",
      open: noop as any,
      seal: defaultDerivationSeal,
      tagSeal: ({ aggregate }) => ({
        aggregate, seal: false
      })
    } as Derivation<SourceType, T, References>,
    derivation
  ) as Derivation<SourceType, T, References>
}

export function declareUnaryDerivation<Emitted, T, References>(derivation: Partial<Omit<Derivation<{ main: Emitter<Emitted> }, T, References>, "graphComponentType" | "derivationSpecies">>): Derivation<{ main: Emitter<Emitted> }, T, References>
export function declareUnaryDerivation<Emitted, T, References>(derivation: Partial<Omit<Derivation<{ main: Emitter<Emitted> }, T, References>, "graphComponentType" | "derivationSpecies">>): Derivation<{ main: Emitter<Emitted> }, T, References> {
  return Object.assign(
    {
      derivationSpecies: "Transform",
      graphComponentType: "Derivation",
      close: noop,
      consume: ({ aggregate }) => ({ aggregate }),
      consumes: {},
      emits: new Set(),
      name: "AnonymousDerivation",
      open: noop as any,
      seal: defaultDerivationSeal,
      tagSeal: ({ aggregate }) => ({
        aggregate, seal: false
      })
    } as Derivation<{ main: Emitter<Emitted> }, T, References>,
    derivation
  ) as Derivation<{ main: Emitter<Emitted> }, T, References>
}

function getControllerFromSources(sources: Record<string, Emitter<any>>): Option<ControllerInstance<any>> {
  let oneAndOnlyController = undefined as Possible<ControllerInstance<any>>

  for (const key in sources) {
    const sourceInstance = sources[key]

    if (isSome(sourceInstance.controller)) {
      if (oneAndOnlyController === undefined) {
        oneAndOnlyController = sourceInstance.controller.value
      } else if (oneAndOnlyController !== sourceInstance.controller.value) {
        throw new Error("Tried to instantiate a derivation with sources that had different controllers")
      }
    }
  }

  return fromNullable(oneAndOnlyController)
}

export function instantiateDerivation<SourceType extends Record<string, Emitter<any>>, T, Aggregate>(derivation: Derivation<SourceType, T, Aggregate>, sources: SourceType, { id }: { id?: string } = {}): DerivationInstance<SourceType, T, Aggregate> {
  const tag = initializeTag(
    derivation.name,
    id
  )

  if (derivation.derivationSpecies === "Relay") {
    throw new Error("Not implemented")
  }

  const sourceController: Option<ControllerInstance<any>> = getControllerFromSources(sources)

  const derivationInstance = {
    prototype: derivation,
    derivationSpecies: derivation.derivationSpecies,
    lifecycle: {
      state: "READY"
    },
    aggregate: none,
    consumers: new Set(),
    queryExtensions: OneToManyBinMap(),
    backpressure: backpressure(),
    controller: sourceController,
    sourcesByRole: sources,
    sealedSources: new Set(
      filterIterable(
        allSources(sources),
        s => ["SEALED", "ENDED"].includes(s.lifecycle.state)
      )
    ),
    id: tag
  } as DerivationInstance<SourceType, T, Aggregate>

  pipe(
    sourceController,
    map(
      c => c.registerComponent(derivationInstance)
    )
  )

  return derivationInstance
}

export async function emit<T, References>(
  derivation: DerivationInstance<any, T, References>,
  event: T | ControlEvent,
  tag: Possible<string>
) {
  if (derivation.lifecycle.state === "ACTIVE") {
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
  sourceSubscribe: (source: SourceInstance<any, any>, derivation: DerivationInstance<any, any, any>) => void,
  siphonPressure = true
) {
  if (derivation.lifecycle.state !== "ENDED") {
    derivation.consumers.add(consumer)

    if (isSome(derivation.controller)) {
      propagateController(
        consumer,
        derivation.controller.value
      )
    }

    if (siphonPressure) {
      siphon(derivation, sourceSubscribe)
    }
  } else {
    throw new Error(`Attempted action subscribe() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
  }
}

export function siphon(derivation: DerivationInstance<any, any, any>, sourceSubscribe: (source: SourceInstance<any, any>, derivation: DerivationInstance<any, any, any>) => void) {
  if (derivation.lifecycle.state === 'READY') {
    open(derivation)
  }

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
  outcome: Outcome
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
      if (derivation.lifecycle.state === 'ACTIVE') {
        if (e === EndOfTagEvent) {
          const endingTag = defined(tag)
          const extendedTag = derivation.queryExtensions.findBinOwner(endingTag)

          const updatedSet = (() => {
            if (extendedTag !== undefined) {
              return derivation.queryExtensions.deletePair(extendedTag, endingTag)
            } else {
              return undefined
            }
          })()

          const extendedTagOutcome = extendedTag === undefined ? 'NONE' as 'NONE' : updatedSet?.size ? 'TAGS_REMAINING' as 'TAGS_REMAINING' : 'NO_TAGS_EXTENDING' as 'NO_TAGS_EXTENDING'

          const toSeal = [
            defined(tag, "Received EndOfTagEvent with no attendant tag"),
            ...extendedTagOutcome === 'NO_TAGS_EXTENDING' ? [defined(extendedTag)] : []
          ]

          let willSeal = false
          const downstreamTag = extendedTag === undefined ? tag : extendedTag
          for (const sealingTag of toSeal) {
            // 1. Call derivation's implementation of tagSeal
            const tagSealResult = derivation.prototype.tagSeal({
              aggregate: getSome(derivation.aggregate),
              source,
              tag: sealingTag,
              extendedTag,
              remainingUnsealedSources: remainingUnsealedSources(derivation),
              role: getSourceRole(derivation, source),
              remainingUnsealedTags: derivation.queryExtensions.binOccupants()
            })

            if ("aggregate" in tagSealResult) {
              derivation.aggregate = some(tagSealResult.aggregate)
            }

            if ("output" in tagSealResult) {
              await scheduleEmissions(
                derivation,
                tagSealResult.output,
                downstreamTag
              )
            }

            willSeal = willSeal || sealNormalized(tagSealResult)

            // 2. Notify controller
            pipe(
              derivation.controller,
              map(
                c => c.handleTaggedEvent(e, defined(tag, "Received EndOfTagEvent without a tag argument"), derivation)
              )
            )
          }

          if (extendedTagOutcome === 'NO_TAGS_EXTENDING') {
            await scheduleEmissions(
              derivation,
              [EndOfTagEvent],
              downstreamTag
            )
          }

          if (willSeal) {
            await seal(derivation, SealEvent)
          }
        } else if (e === SealEvent) {
          derivation.sealedSources.add(source)
          const sealResult = derivation.prototype.seal({
            aggregate: getSome(derivation.aggregate),
            source,
            role: getSourceRole(
              derivation,
              source
            ),
            remainingUnsealedSources: remainingUnsealedSources(derivation),
            remainingUnsealedTags: derivation.queryExtensions.binOwners()
          })

          if ("aggregate" in sealResult) {
            derivation.aggregate = some(sealResult.aggregate)
          }

          await scheduleEmissions(
            derivation,
            sealResult.output,
            undefined
          )

          if (sealNormalized(sealResult)) {
            seal(derivation, e)
          }
        } else {
          const extendedTag = tag === undefined ? undefined : derivation.queryExtensions.findBinOwner(tag)
          if (tag !== undefined && extendedTag === undefined) {
            derivation.queryExtensions.addPair(tag, tag)
          }

          const healedExtendedTag = extendedTag === undefined && tag !== undefined ? tag : extendedTag

          const inAggregate = getSome(derivation.aggregate)

          const role = getSourceRole(
            derivation,
            source
          )

          const consumeResult = derivation.prototype.consume({
            event: e,
            tag,
            extendedTag: healedExtendedTag,
            aggregate: inAggregate,
            source,
            role
          })

          if ("aggregate" in consumeResult) {
            derivation.aggregate = some(
              consumeResult.aggregate
            )
          }

          if (consumeResult.effects !== undefined) {
            const { effects } = consumeResult

            effects.forEach(
              effect => {
                const { eventTag, extendOperation } = effect

                if (tag !== undefined && eventTag !== undefined && extendOperation) {

                  derivation.queryExtensions.addPair(tag, eventTag)
                }

                if (effect.tag === "push") {
                  const {
                    component,
                    events
                  } = effect

                  pipe(
                    derivation.controller,
                    fold(
                      () => left("Tried to push with no controller to facilitate"),
                      c => foldingGet(
                        c.componentsById,
                        component,
                        instance => right(instance),
                        () => left(`Component with ID ${component} not found on controller`)
                      )
                    ),
                    mapRight(
                      instance => ("push" in instance && instance.push ? right(void instance.push(events, eventTag)) : left(`Component ${component} has no push functionality`)) as Either<string, undefined>
                    ),
                    flatten,
                    mapLeft(
                      s => {
                        throw new Error(s)
                      }
                    )
                  )
                } else {
                  const {
                    component,
                    query
                  } = effect

                  pipe(
                    derivation.controller,
                    fold(
                      () => left("Tried to pull with no controller to facilitate"),
                      c => foldingGet(
                        c.componentsById,
                        component,
                        instance => right(instance),
                        () => left(`Component with ID ${component} not found on controller`)
                      )
                    ),
                    mapRight(
                      instance => ("pull" in instance && instance.pull ? right(void instance.pull(query, eventTag)) : left(`Component ${component} has no pull functionality`)) as Either<string, undefined>
                    ),
                    flatten,
                    mapLeft(
                      s => {
                        throw new Error(s)
                      }
                    )
                  )
                }
              }
            )
          }

          if (consumeResult.output !== undefined) {
            await scheduleEmissions(
              derivation,
              consumeResult.output,
              healedExtendedTag
            )
          }
        }
      } else {
        throw new Error(`Attempted action consume() on derivation ${derivation.id} in incompatible lifecycle state: ${derivation.lifecycle.state}`)
      }
    }, derivation, some(e))
}

function sealNormalized(pullResult: undefined | {} | { seal?: boolean | (() => boolean) }) {
  if (pullResult === undefined) {
    return false
  } else if ("seal" in pullResult && !("prototype" in pullResult)) {
    const { seal } = pullResult

    if (typeof seal === "function") {
      return seal()
    } else {
      return !!seal
    }
  } else {
    return false
  }
}
