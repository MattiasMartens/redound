import { defer } from "@/patterns/async"
import { forEachIterable } from "@/patterns/iterables"
import { Controller, Outcome, SealEvent } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, SinkInstance, SourceInstance } from "@/types/instances"
import { constUndefined, pipe } from "fp-ts/lib/function"
import { fold, fromNullable, isNone, map, none, Option, some } from "fp-ts/lib/Option"
import { defaultControllerRescue, defaultControllerSeal, defaultControllerTaggedEvent } from "./helpers"
import { close } from "./source"
import { initializeTag } from "./tags"
import {
  foldingGet, getOrElse
} from "big-m"
import { left, map as mapRight } from "fp-ts/lib/Either"
import { noop } from "@/patterns/functions"

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
  { id, sources, sourcesByRole }: { id?: string, sources?: SourceInstance<any, any>[], sourcesByRole?: Record<string, SourceInstance<any, any>> } = {}
): ControllerInstance<Finalization> {
  const tag = initializeTag(
    controller.name,
    id
  )

  const outcomePromise = defer<Outcome<any, Finalization>>()
  const domain = {
    sources: new Set([...sources || [], ...Object.values(sourcesByRole || {})]),
    sinks: new Set<SinkInstance<any, any, any>>(),
    sourcesByRole: new Map(Object.entries(sourcesByRole || {}))
  }

  const allSinksClosed = defer()

  const propagateOutcome = (outcome: Outcome<any, Finalization>) => {
    debugger;
    forEachIterable(
      domain.sources,
      sourceInstance => close(sourceInstance, outcome)
    )

    outcomePromise.resolve(outcome)
  }

  const controllerInstance: ControllerInstance<Finalization> = {
    id: tag,
    outcome: none,
    pull: ({ query, role, tag }) => {
      return foldingGet(
        domain.sourcesByRole,
        role,
        source => source.pull ? source.pull(query, tag) : left(new Error("Source does not have pull functionality")),
        () => left(new Error(`Role ${role} does not exist on source`))
      )
    },
    push: (event, role) => {
      return foldingGet(
        domain.sourcesByRole,
        role,
        source => source.pull ? source.pull(event) : left(new Error("Source does not have push functionality")),
        () => left(new Error(`Role ${role} does not exist on source`))
      )
    },
    // Object to pass to graph components, which should not receive the Promise returned by the Right outcome of a pull or push operation lest they await it and cause a (potential, pending event-tag tracking) deadlock.
    capabilities: {
      pull: ({ query, role, tag: queryTag }) => {
        return foldingGet(
          domain.sourcesByRole,
          role,
          source => pipe(
            source.pull,
            fromNullable,
            fold(
              () => left(new Error("Source does not have pull functionality")),
              pullFn => pipe(
                pullFn(query, queryTag),
                mapRight(noop)
              )
            )
          )
        )
      },
      push: (event, role) => {
        return foldingGet(
          domain.sourcesByRole,
          role,
          source => pipe(
            source.pull,
            fromNullable,
            fold(
              () => left(new Error("Source does not have push functionality")),
              pullFn => pipe(
                pullFn(event),
                mapRight(noop)
              )
            )
          ),
          () => left(new Error(`Role ${role} does not exist on source`))
        )
      },
    },
    awaitOutcome: () => outcomePromise.promise,
    async rescue(error: Error, event: Option<any>, notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>) {
      pipe(
        await controller.rescue(error, event, notifyingComponent, domain),
        map(
          propagateOutcome
        )
      )
    },
    async seal(sealEvent: SealEvent) {
      pipe(
        await controller.seal(sealEvent, domain),
        map(
          propagateOutcome
        )
      )
    },
    registerSource(
      sourceInstance,
      role?: string
    ) {
      if (role !== undefined) {
        if (domain.sourcesByRole.has(role)) {
          if (domain.sourcesByRole.get(role) !== sourceInstance) {
            throw new Error(`Tried to add source ${sourceInstance.id} to controller on role ${role} but it was already specified`)
          }
        } else {
          domain.sourcesByRole.set(role, sourceInstance)
        }
      }

      domain.sources.add(sourceInstance)

      propagateController(
        sourceInstance,
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
    sourcesByRole: domain.sourcesByRole,
    taggedEvent: async (event: any, tag: string, notifyingComponent) => pipe(
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
    close() {
      for (const sink of domain.sinks) {
        if (sink.lifecycle.state !== "ENDED") {
          return
        }

        allSinksClosed.resolve()
      }
    },
    allSinksClosed: () => allSinksClosed.promise,
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
