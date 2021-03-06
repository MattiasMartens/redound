import {
  Outcome,
  Sink
} from '@/types/abstract'
import { SinkInstance, GenericEmitterInstance, ControllerInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { fold, fromNullable, none, some, Option, isSome, isNone } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'
import { noop, noopAsync } from '@/patterns/functions'
import { pipe } from 'fp-ts/lib/function'
import { ControlEvent, SealEvent, EndOfTagEvent } from '@/types/events'
import { map } from 'fp-ts/lib/Option'
import { defer, Deferred } from '@/patterns/async'
import { isLeft, left, mapLeft, right } from 'fp-ts/lib/Either'
import { Possible } from '@/types/patterns'
import { defined } from '@/patterns/insist'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References, SinkResult>(sink: Partial<Omit<Sink<T, References, SinkResult>, 'graphComponentType'>>): Sink<T, References, SinkResult>
export function declareSimpleSink<T, References, SinkResult>(sink: Partial<Omit<Sink<T, References, SinkResult>, 'graphComponentType'>>): Sink<T, References, SinkResult> {
  // @ts-ignore
  sink.graphComponentType = "Sink"
  return Object.assign(
    {
      graphComponentType: "Sink",
      close: noop,
      consume: noop,
      seal: noop as any,
      tagSeal: noop,
      consumes: new Set(),
      name: "AnonymousSink",
      open: noop as any
    } as Sink<T, References, SinkResult>,
    sink
  )
}

export type AsyncIterableSinkState<T> = {
  nextToYieldDeferred: Deferred<Option<T>>,
  controlReturnedDeferred: Deferred<void>
}

export type AsyncIterableSinkInstance<T> = SinkInstance<T, AsyncIterableSinkState<T>, void> & AsyncIterable<T> & { isAsyncIterableSink: true }
export type AsyncIterableSink<T> = Sink<T, AsyncIterableSinkState<T>, undefined> & { isAsyncIterableSink: true }

export const AsyncIterableSinkPrototype = {
  isAsyncIterableSink: true,
  close: (references, outcome) => void pipe(
    outcome,
    map(
      l => references.nextToYieldDeferred.reject(l)
    )
  ),
  consume: async ({ event, references }) => {
    references.nextToYieldDeferred.resolve(some(event))
    references.controlReturnedDeferred = defer()
    references.nextToYieldDeferred = defer<any>()
    await references.controlReturnedDeferred.promise
  },
  consumes: new Set(),
  graphComponentType: "Sink",
  name: "AsyncIterable",
  open: () => ({
    nextToYieldDeferred: defer<Option<any>>(),
    controlReturnedDeferred: defer()
  }),
  tagSeal: noopAsync,
  seal: (r) => {
    r.nextToYieldDeferred.resolve(none)
    r.controlReturnedDeferred.resolve()
  }
} as AsyncIterableSink<any>
export const asyncIterableSink = <T>() => AsyncIterableSinkPrototype as AsyncIterableSink<T>

/**
 * A special-case sink which can be iterated over only once with
 * for-await-of, and which does not subscribe to its emitter until
 * this iteration has begun.
 */
export function instantiateAsyncIterableSink<T>(subscribeToEmitter: (sinkInstance: SinkInstance<T, any, any>) => void, { id }: { id?: string } = {}) {
  const tag = initializeTag(
    "AsyncIterable",
    id
  )

  const finalizedSinkResultPromise = defer<void>()

  const sinkInstance = {
    prototype: asyncIterableSink(),
    siphoning: true,
    lifecycle: {
      state: "ACTIVE"
    },
    references: some({
      controlReturnedDeferred: defer(),
      nextToYieldDeferred: defer<any>()
    }),
    controller: none,
    sinkResult: () => finalizedSinkResultPromise.promise,
    tagSeal: noopAsync,
    async seal() {
      sinkInstance.prototype.seal(
        getSome(sinkInstance.references)
      )

      finalizedSinkResultPromise.resolve()

      sinkInstance.lifecycle = {
        state: "SEALED"
      }
    },
    async close(outcome: Outcome) {
      if (sinkInstance.lifecycle.state !== "ENDED") {
        if (isSome(outcome)) {
          finalizedSinkResultPromise.reject(outcome.value.error)
        }

        const references = getSome(sinkInstance.references)

        sinkInstance.prototype.close(references, outcome)
        sinkInstance.references = none
        sinkInstance.lifecycle = {
          state: "ENDED",
          outcome
        }
      } else {
        throw new Error(`Attempted action close() on sink ${sinkInstance.id} in incompatible lifecycle state: ${sinkInstance.lifecycle.state}`)
      }

      sinkInstance.lifecycle = { state: "ENDED", outcome }
    },
    id: tag,
    [Symbol.asyncIterator]: async function* () {
      if (isSome(sinkInstance.controller)) {
        throw new Error("Cannot iterate more than once over a sink")
      }

      subscribeToEmitter(sinkInstance)
      const references = getSome(sinkInstance.references)

      try {
        let consumed: Option<T> = none
        while (!isNone(consumed = await references.nextToYieldDeferred.promise)) {
          yield getSome(consumed)
          // This promise is set by consume(); if we're here, then by definition control has returned to the async iterable sink's code.
          references.controlReturnedDeferred.resolve()
        }
      } catch (e) {
        sinkInstance.close(some(e))
        throw e
      } finally {
        references.controlReturnedDeferred.resolve()
        if (sinkInstance.lifecycle.state !== "ENDED") {
          sinkInstance.close(none)
        }
      }
    }
  } as SinkInstance<T, AsyncIterableSinkState<T>, void> & AsyncIterable<T>

  return sinkInstance
}

export function instantiateSink<T, References, SinkResult>(sink: Sink<T, References, SinkResult>, { id, controller, siphon = true }: { id?: string, controller?: ControllerInstance<any>, siphon?: boolean } = {}): SinkInstance<T, References, SinkResult> {
  const tag = initializeTag(
    sink.name,
    id
  )

  /**
   * Logic here: if seal() is called on sink, and a controller is present, sink can generate sink result and broadcast it to controller.
   * But it does not immediately resolve the sinkResult Promise.
   * Instead, it waits for Finalization from the controller.
   * If the controller finalizes with an error, it rejects with that.
   * Otherwise, it resolves with the original singResult.
   * If seal() is called on sink with no controller present, it instead resolves immediately.
   * If close() is called on sink with or without a controller present, at a stage where seal() has not been called, it rejects with either the Outcome error if Left, or a generic "stream ended prematurely" error if Right.
   */
  let withheldSinkResult = none as Option<SinkResult | Promise<SinkResult>>
  const finalizedSinkResultPromise = defer<SinkResult>()

  const sourceController = fromNullable(controller)

  const sinkInstance = {
    prototype: sink,
    siphoning: siphon,
    lifecycle: {
      state: "ACTIVE"
    },
    references: some(sink.open()),
    controller: sourceController,
    sinkResult: () => finalizedSinkResultPromise.promise,
    async tagSeal(tag) {
      sinkInstance.prototype.tagSeal(
        tag,
        getSome(sinkInstance.references)
      )


      await pipe(
        sinkInstance.controller,
        fold(
          noopAsync,
          async controller => {
            try {
              await controller.handleTaggedEvent(
                EndOfTagEvent,
                tag,
                sinkInstance
              )
            } catch (e) {
              await controller.rescue(
                e,
                some(tag),
                sinkInstance
              )
            }
          }
        )
      )
    },
    async seal() {
      const sinkResultPromise = sinkInstance.prototype.seal(
        getSome(sinkInstance.references)
      )

      sinkInstance.lifecycle = {
        state: "SEALED"
      }

      // TODO Same logic in other graph components
      await pipe(
        sinkInstance.controller,
        fold(
          async () => {
            finalizedSinkResultPromise.resolve(sinkResultPromise)
          },
          async controller => {
            try {
              withheldSinkResult = some(sinkResultPromise)
              const awaitedSinkResult = await sinkResultPromise

              await controller.seal({
                graphComponentType: sinkInstance.prototype.graphComponentType,
                instance: sinkInstance,
                result: awaitedSinkResult
              })
            } catch (e) {
              finalizedSinkResultPromise.reject(e)

              await controller.rescue(
                e,
                none,
                sinkInstance
              )
            }
          }
        )
      )
    },
    async close(outcome: Outcome) {
      if (sinkInstance.lifecycle.state !== "ENDED") {
        if (isSome(outcome)) {
          finalizedSinkResultPromise.reject(outcome.value.error)
        } if (isSome(withheldSinkResult)) {
          finalizedSinkResultPromise.resolve(withheldSinkResult.value)
        } else if (sinkInstance.lifecycle.state !== "SEALED") {
          finalizedSinkResultPromise.reject(
            new Error(`Sink ${tag} was closed before seal event, so cannot generate a correct result`)
          )
        }

        const references = getSome(sinkInstance.references)

        await sink.close(references, outcome)
        sinkInstance.references = none
        sinkInstance.lifecycle = {
          state: "ENDED",
          outcome
        }

        pipe(
          sinkInstance.controller,
          map(
            c => c.handleClose(sinkInstance)
          )
        )
      } else {
        throw new Error(`Attempted action close() on sink ${sinkInstance.id} in incompatible lifecycle state: ${sinkInstance.lifecycle.state}`)
      }

      sinkInstance.lifecycle = { state: "ENDED", outcome }
    },
    id: tag
  } as SinkInstance<T, References, SinkResult>

  return sinkInstance
}

export async function consume<T, MemberOrReferences>(
  source: GenericEmitterInstance<T, MemberOrReferences>,
  sink: SinkInstance<T, any, any>,
  event: T | ControlEvent,
  tag: Possible<string>
) {
  if (sink.lifecycle.state === 'ACTIVE') {
    if (event === EndOfTagEvent) {
      await sink.tagSeal(defined(tag), getSome(sink.references))

      await pipe(
        sink.controller,
        fold(
          noopAsync,
          c => c.handleTaggedEvent(event, defined(tag), sink)
        )
      )
    } else if (event === SealEvent) {
      await sink.seal(getSome(sink.references))
    } else {
      const references = getSome(sink.references)
      try {
        await sink.prototype.consume({ event: event as T, references, tag })
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
