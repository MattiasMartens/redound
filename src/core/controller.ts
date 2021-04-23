import { defer } from "@/patterns/async"
import { forEachIterable } from "@/patterns/iterables"
import { Controller, Outcome, SealEvent } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, SinkInstance, SourceInstance } from "@/types/instances"
import { pipe } from "fp-ts/lib/function"
import { isNone, map, none, Option, some } from "fp-ts/lib/Option"
import { defaultControllerRescue, defaultControllerSeal, defaultControllerTaggedEvent } from "./helpers"
import { close } from "./source"
import { initializeTag } from "./tags"

type ControllerReceiver = DerivationInstance<any, any, any> | SourceInstance<any, any> | SinkInstance<any, any, any>

export async function propagateController(
  component: ControllerReceiver,
  controller: ControllerInstance<any>
) {
  if (isNone(component.controller)) {
    component.controller = some(controller)

    if ("consumers" in component) {
      forEachIterable(
        component.consumers,
        receiver => propagateController(
          receiver,
          controller
        )
      )
    } else {
      controller.sinks.add(component)
    }
  } else {
    const existingController = component.controller.value

    if (existingController !== controller) {
      throw new Error(`Tried to propagate controller ${controller.id} to component ${component.id} but it had already received controller ${controller.id}. A component may only have one controller during its lifecycle.`)
    } else {
      // Controller already set by another path, no-op
    }
  }
}

export function instantiateController<Finalization>(
  controller: Controller<Finalization>,
  { id, sources }: { id?: string, sources?: SourceInstance<any, any>[] } = {}
): ControllerInstance<Finalization> {
  const tag = initializeTag(
    controller.name,
    id
  )

  const outcomePromise = defer<Outcome<any, Finalization>>()
  const domain = {
    sources: new Set(sources),
    sinks: new Set<SinkInstance<any, any, any>>()
  }

  const allSinksClosed = defer()

  const controllerInstance: ControllerInstance<Finalization> = {
    id: tag,
    outcome: none,
    awaitOutcome: () => outcomePromise.promise,
    async rescue(error: Error, event: Option<any>, notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>) {
      pipe(
        await controller.rescue(error, event, notifyingComponent, domain),
        map(
          outcome => {
            forEachIterable(
              domain.sources,
              sourceInstance => close(sourceInstance, outcome)
            )

            outcomePromise.resolve(outcome)
          }
        )
      )
    },
    async seal(sealEvent: SealEvent) {
      pipe(
        await controller.seal(sealEvent, domain),
        map(
          outcome => {
            forEachIterable(
              domain.sources,
              sourceInstance => close(sourceInstance, outcome)
            )

            outcomePromise.resolve(outcome)
          }
        )
      )
    },
    registerSource(
      sourceInstance
    ) {
      domain.sources.add(sourceInstance)
      propagateController(
        sourceInstance,
        controllerInstance
      )

      pipe(
        controllerInstance.outcome,
        map(
          outcome => {
            forEachIterable(
              domain.sources,
              sourceInstance => close(sourceInstance, outcome)
            )

            outcomePromise.resolve(outcome)
          }
        )
      )
    },
    sources: domain.sources,
    sinks: domain.sinks,
    taggedEvent: () => {
      // TODO
      throw new Error("Not implemented")
    },
    close() {
      for (const sink of domain.sinks) {
        if (sink.lifecycle.state !== "ENDED") {
          return
        }

        allSinksClosed.resolve()
      }
    },
    allSinksClosed: () => allSinksClosed.promise
  }

  forEachIterable(
    domain.sources,
    source => propagateController(
      source,
      controllerInstance
    )
  )

  return controllerInstance
}

export function controller<T>(
  partialController: Partial<Controller<T>> = {}
): Controller<T> {
  return {
    name: "Controller",
    rescue: defaultControllerRescue,
    seal: defaultControllerSeal,
    taggedEvent: defaultControllerTaggedEvent,
    ...partialController
  }
}

export function makeController<T>(
  partialController: Partial<Controller<T>> = {}
) {
  return instantiateController(
    controller(
      partialController
    )
  )
}
