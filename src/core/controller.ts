import { defer } from "@/patterns/async"
import { forEachIterable } from "@/patterns/iterables"
import { Controller, CoreEvent, Event, Outcome, SealEvent, Source } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, SinkInstance, SourceInstance } from "@/types/instances"
import { pipe } from "fp-ts/lib/function"
import { isNone, isSome, map, none, Option, some } from "fp-ts/lib/Option"
import { close } from "./source"
import { initializeTag } from "./tags"

type ControllerReceiver = {
  controller: Option<ControllerInstance<any>>
  consumers?: Set<ControllerReceiver>,
  id: string
}

export async function propagateController(
  component: ControllerReceiver,
  controller: ControllerInstance<any>
) {
  if (isNone(component.controller)) {
    component.controller = some(controller)

    if (component.consumers) {
      forEachIterable(
        component.consumers,
        receiver => propagateController(
          receiver,
          controller
        )
      )
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
    sources: new Set(sources)
  }

  const controllerInstance: ControllerInstance<Finalization> = {
    id: tag,
    outcome: none,
    awaitOutcome: () => outcomePromise.promise,
    async rescue(error: Error, event: CoreEvent<any>, notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any>) {
      pipe(
        await controller.rescue(error, event, notifyingComponent, domain),
        map(
          outcome => forEachIterable(
            domain.sources,
            sourceInstance => close(sourceInstance, outcome)
          )
        )
      )
    },
    async seal(sealEvent: SealEvent) {
      pipe(
        await controller.seal(sealEvent, domain),
        map(
          outcome => forEachIterable(
            domain.sources,
            sourceInstance => close(sourceInstance, outcome)
          )
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
          outcome => close(
            sourceInstance,
            outcome
          )
        )
      )
    },
    sources: domain.sources,
    async taggedEvent(event, notifyingComponent) {
      pipe(
        await controller.taggedEvent(event, notifyingComponent, domain),
        map(
          outcome => forEachIterable(
            domain.sources,
            sourceInstance => close(sourceInstance, outcome)
          )
        )
      )
    }
  }

  return controllerInstance
}
