import { defer } from "@/patterns/async"
import { forEachIterable } from "@/patterns/iterables"
import { Controller, Outcome, SealEvent } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, SinkInstance, SourceInstance } from "@/types/instances"
import { constUndefined, pipe } from "fp-ts/lib/function"
import { fold, fromNullable, isNone, isSome, map, none, Option, some } from "fp-ts/lib/Option"
import { defaultControllerRescue, defaultControllerSeal, defaultControllerTaggedEvent } from "./helpers"
import { close } from "./source"
import { initializeTag } from "./tags"
import {
  foldingGet
} from "big-m"
import { left, map as mapRight } from "fp-ts/lib/Either"
import { noop } from "@/patterns/functions"
import { getSome } from "@/patterns/options"

type ControllerReceiver = DerivationInstance<any, any, any> | SourceInstance<any, any> | SinkInstance<any, any, any>

export async function propagateController(
  component: ControllerReceiver,
  controller: ControllerInstance<any>
) {
  if (isNone(component.controller)) {
    component.controller = some(controller)
    controller.registerComponent(component)

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
  { id, waitForPressure = controller.waitForPressure }: { id?: string, waitForPressure?: number } = {}
): ControllerInstance<Finalization> {
  const tag = initializeTag(
    controller.name,
    id
  )

  const outcomePromise = defer<Outcome>()
  const domain = {
    sources: new Set<SourceInstance<any, any>>(),
    sinks: new Set<SinkInstance<any, any, any>>(),
    componentsById: new Map<string, Emitter<any> | SinkInstance<any, any, any>>()
  }

  const allSinksClosed = defer()

  const propagateOutcome = (outcome: Outcome) => {
    if (!isSome(controllerInstance.outcome)) {
      controllerInstance.outcome = some(outcome)
      forEachIterable(
        domain.sources,
        sourceInstance => close(sourceInstance, outcome)
      )

      outcomePromise.resolve(outcome)
    } else {
      console.error(`Attempted to close a controller with an outcome when an outcome already existed.
      Outcome 1:`)
      console.error(getSome(controllerInstance.outcome))
      console.error(`Outcome 2:`)
      console.error(outcome)
    }
  }

  const controllerInstance: ControllerInstance<Finalization> = {
    prototype: controller,
    id: tag,
    waitForPressure,
    outcome: none,
    componentsById: domain.componentsById,
    pull: ({ query, id, tag }) => {
      return foldingGet(
        domain.componentsById,
        id,
        source => ("pull" in source && source.pull) ? source.pull(query, tag) : left(new Error("Component does not have pull functionality")),
        () => left(new Error(`Graph component with ID ${id} does not exist`))
      )
    },
    push: ({ events, id, tag }) => {
      return foldingGet(
        domain.componentsById,
        id,
        source => ("push" in source && source.push) ? source.push(events, tag) : left(new Error("Component does not have push functionality")),
        () => left(new Error(`Graph component with ID ${id} does not exist`))
      )
    },
    promisedOutcome: () => outcomePromise.promise,
    async rescue(error: Error, event: Option<any>, notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>) {
      pipe(
        await controller.rescue(error, event, notifyingComponent, domain),
        map(
          propagateOutcome
        )
      )
    },
    async seal(sealEvent: SealEvent) {
      const sealResult = await controller.seal(sealEvent, domain)

      pipe(
        sealResult,
        map(
          propagateOutcome
        )
      )
    },
    registerComponent(
      component
    ) {
      const { id } = component

      if (domain.componentsById.has(id)) {
        if (domain.componentsById.get(id) !== component) {
          throw new Error(`Tried to add ${component.prototype.graphComponentType} ${id} to controller but it was already specified`)
        }
      } else {
        domain.componentsById.set(id, component)
      }

      if (component.prototype.graphComponentType === "Source") {
        domain.sources.add(component as SourceInstance<any, any>)
      }

      propagateController(
        component,
        controllerInstance
      )

      pipe(
        controllerInstance.outcome,
        map(
          propagateOutcome
        )
      )
    },
    sources: domain.sources,
    sinks: domain.sinks,
    handleTaggedEvent: async (event: any, tag: string, notifyingComponent) => pipe(
      await controller.taggedEvent(
        event,
        tag,
        notifyingComponent,
        domain
      ),
      fold(
        constUndefined,
        propagateOutcome
      )
    ),
    handleClose() {
      for (const sink of domain.sinks) {
        if (sink.lifecycle.state !== "ENDED") {
          return
        }

        allSinksClosed.resolve()
      }
    },
    allSinksClosed: () => allSinksClosed.promise,
    close: (a: any) => {
      propagateOutcome(a)
    }
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
    waitForPressure: 1,
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
