import {
  Outcome,
  Sink
} from '@/types/abstract'
import { SinkInstance, GenericEmitterInstance, ControllerInstance } from '@/types/instances'
import { getSome } from '@/patterns/options'
import { fold, fromNullable, none, some, Option, isSome } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'
import { noop, noopAsync } from '@/patterns/functions'
import { pipe } from 'fp-ts/lib/function'
import { ControlEvent, SealEvent, EndOfTagEvent } from '@/types/events'
import { map } from 'fp-ts/lib/Option'
import { defer } from '@/patterns/async'
import { isLeft, left } from 'fp-ts/lib/Either'
import { Possible } from '@/types/patterns'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References, SinkResult>(sink: Partial<Omit<Sink<T, References, SinkResult>, 'graphComponentType'>>): Sink<T, References, SinkResult> {
  // @ts-ignore
  sink.graphComponentType = "Sink"
  return Object.assign(
    {
      graphComponentType: "Sink",
      close: noop,
      consume: noop,
      seal: noop,
      consumes: new Set(),
      name: "AnonymousSink",
      open: noop
    } as Sink<T, References, SinkResult>,
    sink
  )
}

const defaultCapabilities = {
  push: () => left(new Error("No controller present, so push not supported")),
  pull: () => left(new Error("No controller present, so pull not supported"))
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
    latestTickByProvenance: new Map(),
    lifecycle: {
      state: "ACTIVE"
    },
    references: some(sink.open(
      pipe(
        sourceController,
        fold(
          () => defaultCapabilities,
          c => c.capabilities
        )
      )
    )),
    controller: sourceController,
    sinkResult: () => finalizedSinkResultPromise.promise,
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

              controller.seal({
                graphComponentType: sinkInstance.prototype.graphComponentType,
                instance: sinkInstance,
                result: awaitedSinkResult
              })
            } catch (e) {
              finalizedSinkResultPromise.reject(e)

              controller.rescue(
                e,
                none,
                sinkInstance
              )
            }
          }
        )
      )
    },
    async close(outcome: Outcome<any, any>) {
      if (sinkInstance.lifecycle.state !== "ENDED") {
        if (isLeft(outcome)) {
          finalizedSinkResultPromise.reject(outcome.left.error)
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
            c => c.close(sinkInstance)
          )
        )
      } else {
        throw new Error(`Attempted action close() on sink ${sinkInstance.id} in incompatible lifecycle state: ${sinkInstance.lifecycle.state}`)
      }

      sinkInstance.lifecycle = { state: "ENDED", outcome }
    },
    capabilities: {
      pull() {
        // TODO
        throw new Error("Not implemented")
      },
      push() {
        // TODO
        throw new Error("Not implemented")
      }
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
  if (sink.lifecycle.state === "ACTIVE") {
    if (event === EndOfTagEvent) {
      // TODO
      throw new Error("Not implemented")
    } else if (event === SealEvent) {
      await sink.seal()
    } else {
      const references = getSome(sink.references)
      try {
        await sink.prototype.consume(event as T, references, sink.capabilities)
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
