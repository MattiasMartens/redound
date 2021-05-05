import { chainAsyncResults, iterateOverAsyncResult, PossiblyAsyncResult, voidPromiseIterable, wrapAsync } from '@/patterns/async'
import { countIterable, forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  Outcome,
  Query,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, ControllerInstance } from '@/types/instances'
import {
  noop
} from '@/patterns/functions'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { consume, close as consumerClose } from './consumer'
import { initializeTag } from './tags'
import { propagateController } from './controller'
import { backpressure } from './backpressure'
import { pipe } from 'fp-ts/lib/function'
import { map, Option } from 'fp-ts/lib/Option'
import {
  left,
  map as mapRight,
  right
} from 'fp-ts/lib/Either'
import { ControlEvent, EndOfTagEvent, SealEvent } from '@/types/events'
import { getSome } from '@/patterns/options'
import { Possible } from '@/types/patterns'
import { fold } from 'fp-ts/lib/Option'

// Dependency Map:
// source imports sink
// source imports consumer
// source imports controller
// consumer imports sink
// consumer imports derivation
// derivation imports sink
// (there is no need for a generic "emitter")

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Partial<Omit<Source<T, References>, "graphComponentType">>): Source<T, References> {
  const nullSource = {
    graphComponentType: "Source",
    close: noop,
    emits: new Set(),
    generate: () => ({}),
    name: "AnonymousSource"
  } as Source<T, References>

  return Object.assign(
    nullSource,
    source
  ) as Source<T, References>
}


async function sourceTry<T>(
  fn: () => T | Promise<T>,
  source: SourceInstance<any, any>,
  event: Option<any | ControlEvent>
) {
  try {
    return await fn()
  } catch (e) {
    return pipe(
      source.controller,
      fold(
        () => {
          console.error(`Uncaught error from Derivation with no controller: ${source.id}. Error:
          ${e}
          
          To prevent errors from being logged, add Derivation ${source.id} to a graph with a controller.`)
        },
        c => c.rescue(e, event, source)
      )
    ) as void
  }
}

export function instantiateSource<T, References>(source: Source<T, References>, { id, controller, role }: { id?: string, controller?: ControllerInstance<any>, role?: string } = {}): SourceInstance<T, References> {
  const tag = initializeTag(
    source.name,
    id
  )

  const controllerOption = fromNullable(controller)

  const sourceInstance = {
    prototype: source,
    lifecycle: {
      state: "READY"
    },
    consumers: new Set(),
    references: none,
    backpressure: backpressure(),
    controller: controllerOption,
    id: tag,
    async *[Symbol.asyncIterator]() {
      if (isSome(sourceInstance.controller)) {
        throw new Error("Cannot manually iterate over a source which already has a controller set")
      } else if (sourceInstance.consumers.size) {
        throw new Error("Cannot manually iterate over a source which is already part of a component graph")
      } else if (sourceInstance.lifecycle.state !== "READY") {
        throw new Error(`Tried to manually iterate over source in incompatible lifecycle state: ${sourceInstance.lifecycle.state}`)
      }

      sourceInstance.lifecycle.state = "ITERATING"

      const {
        references,
        output
      } = source.generate()
      sourceInstance.references = some(references as any)

      try {
        for await (const toYield of chainAsyncResults(output)) {
          if (sourceInstance.lifecycle.state !== "ITERATING") {
            return
          } else {
            yield toYield
          }
        }
        close(sourceInstance, right("Successful iteration"))
      } catch (e) {
        close(sourceInstance, left(e))
      }
    },
    pull: source.pull ? (
      (query: Query, queryTag?: string) => {
        const healedQueryTag = queryTag === undefined
          ? initializeTag(sourceInstance.id)
          : initializeTag(undefined, queryTag)

        if (sourceInstance.lifecycle.state === "READY" || sourceInstance.lifecycle.state === "ENDED" || sourceInstance.lifecycle.state === "ITERATING") {
          throw new Error(`Attempted action pull() on source ${id} in incompatible lifecycle state: ${sourceInstance.lifecycle.state}`)
        } else if (sourceInstance.lifecycle.state === "SEALED") {
          return left(new Error("Cannot query this source because it is already sealed"))
        }

        const result = source.pull!(
          query,
          getSome(sourceInstance.references),
          healedQueryTag
        )

        return pipe(
          result,
          mapRight(
            async pullResult => {
              const output = (pullResult !== undefined && "output" in pullResult) ? pullResult.output : pullResult as PossiblyAsyncResult<T>

              try {
                await iterateOverAsyncResult(
                  output,
                  event => {
                    return voidPromiseIterable(
                      mapIterable(
                        sourceInstance.consumers,
                        async c => {
                          await consume(sourceInstance, c, event, healedQueryTag)
                        }
                      )
                    )
                  },
                  () => sourceInstance.lifecycle.state === "ENDED"
                )

                // Emit query finalization event
                if (sourceInstance.lifecycle.state !== "ENDED") {
                  voidPromiseIterable(
                    mapIterable(
                      sourceInstance.consumers,
                      async c => {
                        consume(sourceInstance, c, EndOfTagEvent, healedQueryTag)
                      }
                    )
                  )
                }

                const seal = sealNormalized(pullResult)

                // Emit seal event if specified
                if (sourceInstance.lifecycle.state !== "ENDED" && seal) {
                  voidPromiseIterable(
                    mapIterable(
                      sourceInstance.consumers,
                      async c => {
                        consume(sourceInstance, c, SealEvent, queryTag)
                      }
                    )
                  )
                }
              } catch (e) {
                pipe(
                  sourceInstance.controller,
                  map(
                    c => c.rescue(e, none, sourceInstance)
                  )
                )
              }
            }
          )
        )
      }
    ) : undefined
  } as SourceInstance<T, References>

  pipe(
    controllerOption,
    map(
      controller => controller.registerSource(sourceInstance, role)
    )
  )

  return sourceInstance
}

export async function emit<T, References>(
  source: SourceInstance<T, References>,
  event: T | ControlEvent,
  tag: Possible<string>
) {
  if (source.lifecycle.state === "ACTIVE") {
    return voidPromiseIterable(
      mapIterable(
        source.consumers,
        async c => consume(source, c, event, tag)
      )
    )
  } else {
    throw new Error(`Attempted action emit() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
  }
}

export function open<T, References>(
  source: SourceInstance<T, References>
) {
  sourceTry(() => {
    if (source.lifecycle.state === "READY") {
      const sourceEmit = (e: T | ControlEvent) => {
        return emit(
          source,
          e,
          undefined
        )
      }

      source.lifecycle.state = "ACTIVE"
      const {
        references,
        output
      } = source.prototype.generate()
      source.references = some(references as References)

      void (async () => {
        try {
          await iterateOverAsyncResult(
            output,
            sourceEmit,
            () => source.lifecycle.state === "ENDED"
          )

          if (!source.prototype.pull) {
            seal(source)
          }
        } catch (e) {
          pipe(
            source.controller,
            map(
              /**  NOTE: This captures failures *only* from the generation of events; emitting to a consumer is a can't-fail operation because if there were an error, the consumer would send it to the controller directly. It would never return to the control of this function. */
              c => c.rescue(e, none, source)
            )
          )
        }

      })()
    } else {
      throw new Error(`Attempted action open() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
    }
  }, source, none)
}

export function subscribe<T>(
  source: SourceInstance<T, any>,
  consumer: GenericConsumerInstance<T, any>,
  siphon = true
) {
  sourceTry(() => {
    if (source.lifecycle.state !== "ENDED" && source.lifecycle.state !== "ITERATING") {
      source.consumers.add(consumer)

      if (isSome(source.controller)) {
        propagateController(
          consumer,
          source.controller.value
        )
      }

      // If something subscribes, then by definition it is either a Sink or a Derivation that has a Sink downstream of it.
      // Check if the subscriber is exerting siphon pressure.
      if (source.lifecycle.state === "READY" && siphon) {
        pipe(
          source.controller,
          fold(
            () => open(source),
            c => {
              if (countIterable(c.sinks, s => s.siphoning) >= c.waitForPressure) {
                open(source)
              }
            }
          )
        )
      }
    } else {
      throw new Error(`Attempted action subscribe() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
    }
  }, source, none)
}

export function unsubscribe<T>(
  source: SourceInstance<T, any>,
  consumer: GenericConsumerInstance<T, any>
) {
  source.consumers.delete(consumer)
}

export function seal<T, References>(
  source: SourceInstance<T, References>,
) {
  return sourceTry<void>(
    async () => {
      if (source.lifecycle.state === "ACTIVE") {
        source.lifecycle.state = "SEALED"

        return voidPromiseIterable(
          mapIterable(
            source.consumers,
            consumer => {
              return consume(
                source,
                consumer,
                SealEvent,
                undefined
              )
            }
          )
        )
      } else if (source.lifecycle.state === "ENDED") {
        // no-op
      } else {
        throw new Error(`Attempted action seal() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
      }
    }, source, none)
}

type Finalization = any
export function close<T, References>(
  source: SourceInstance<T, References>,
  outcome: Outcome<T, Finalization>
) {
  sourceTry(
    async () => {
      if (source.lifecycle.state !== "ENDED" && source.lifecycle.state !== "READY") {
        source.lifecycle = {
          outcome,
          state: "ENDED"
        };

        forEachIterable(
          source.consumers,
          consumer => consumer.lifecycle.state !== "ENDED" && consumerClose(
            consumer,
            outcome
          )
        )
      } else {
        throw new Error(`Attempted action close() on source ${source.id} in incompatible lifecycle state: ${source.lifecycle.state}`)
      }
    }, source, none)
}

function sealNormalized(pullResult: undefined | {} | { seal?: boolean | (() => boolean) }) {
  if (pullResult === undefined) {
    return false
  } else if ("seal" in pullResult) {
    const { seal } = pullResult

    if (typeof seal === "function") {
      return seal()
    } else {
      return seal
    }
  } else {
    return false
  }
}
