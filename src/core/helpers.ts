import { Controller, Derivation, GraphEffect, Outcome, PullEffect, PushEffect, SealEvent } from "@/types/abstract"
import { ControllerInstance, DerivationInstance, Emitter, GenericEmitterInstance, PayloadTypeOf, SinkInstance, SourceInstance } from "@/types/instances"
import { none, Option, some } from "fp-ts/lib/Option"
import { makeDerivation } from "./orchestrate"
import { PossiblyAsyncResult } from "@/patterns/async"
import { Possible } from "@/types/patterns"
import { makeController } from "./controller"
import { forEachIterable } from "@/patterns/iterables"
import { open } from "./source"
import { course, head, join } from "@/river"

export const defaultDerivationSeal = (
  { remainingUnsealedSources, aggregate }: { remainingUnsealedSources: Set<any>, aggregate: any }
) => ({
  seal: !remainingUnsealedSources.size,
  output: undefined,
  aggregate
})

export function makeUnaryDerivation<U, T>(
  derivation: Derivation<{ main: Emitter<U> }, T, any>,
  source: Emitter<U>,
  params: { id?: string } = {}
): DerivationInstance<{ main: Emitter<U> }, T, any> {
  return makeDerivation(derivation, { main: source }, params)
}

export function defaultControllerRescue(error: Error, event: Option<any>, notifyingComponent: SourceInstance<any, any> | DerivationInstance<any, any, any> | SinkInstance<any, any, any>) {
  return some(
    some({
      error,
      event,
      componentId: notifyingComponent.id,
      componentName: notifyingComponent.prototype.name,
      componentGraphType: notifyingComponent.prototype.graphComponentType
    })
  )
}

export function defaultControllerSeal(
  sealEvent: SealEvent,
  domain: {
    sources: Set<SourceInstance<any, any>>,
    sinks: Set<SinkInstance<any, any, any>>
  }
): Option<Outcome> {
  if (sealEvent.graphComponentType === "Sink") {
    for (const sink of domain.sinks) {
      if (sink.lifecycle.state === "ACTIVE") {
        return none
      }
    }

    return some(
      none
    )
  } else {
    return none
  }
}

export const defaultControllerTaggedEvent = () => none

export function roleConsumer<DerivationSourceType extends Record<string, Emitter<any>>, T, Aggregate>(
  consumers: { [K in keyof DerivationSourceType]: (
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      tag: Possible<string>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K
    }
  ) => {
    aggregate?: Aggregate,
    output?: PossiblyAsyncResult<T>,
    effects?: GraphEffect<any, any>[]
  }
  }): <K extends keyof DerivationSourceType>(
    params: {
      event: PayloadTypeOf<DerivationSourceType[K]>,
      tag: Possible<string>,
      aggregate: Aggregate,
      source: GenericEmitterInstance<any, unknown>,
      role: K
    }
  ) => {
    aggregate?: Aggregate,
    output?: PossiblyAsyncResult<T>,
    effects?: GraphEffect<any, any>[]
  } {
  return (params) => consumers[params.role](params)
}


export function pullEffect<Pull>({ component, query, eventTag, extendOperation }: { component: string, query: Pull, eventTag?: string, extendOperation?: boolean }): [PullEffect<Pull>] {
  return [
    {
      tag: "pull",
      component,
      query,
      eventTag,
      extendOperation
    }
  ]
}

export function pullEffects(effects: { component: string, query: any, eventTag?: string }[]): PullEffect<any>[] {
  return effects.map(({ component, query, eventTag }) => ({
    tag: "pull",
    component: component,
    query,
    eventTag
  }))
}

export function pushEffect<Push>({ component, events, eventTag, extendOperation }: { component: string, events: PossiblyAsyncResult<Push>, eventTag?: string, extendOperation?: boolean }): [PushEffect<Push>] {
  return [
    {
      tag: "push",
      component: component,
      events,
      eventTag,
      extendOperation
    }
  ]
}

export function pushEffects(effects: { component: string, events: PossiblyAsyncResult<any>, eventTag?: string, extendOperation?: boolean }[]): PushEffect<any>[] {
  return effects.map(({ component, events, eventTag, extendOperation }) => ({
    tag: "push",
    component: component,
    events,
    eventTag,
    extendOperation
  }))
}

export function normalizeControllerArg(
  controller: ControllerInstance<any> | Controller<any> | "GENERIC"
) {
  if (controller === "GENERIC") {
    return makeController()
  } else if ("prototype" in controller) {
    return controller
  } else {
    return makeController(controller)
  }
}

/**
 * @param controllerArg The controller the components will be assigned to.
 * @param waterway Function that defines the relationships between components using the river idiom.
 * Can return anything at all, as the caller's context requires.
 * It makes sense for it to return the graph's sinks.
 * @returns The result of calling waterway().
 */
export function makeGraph<T>(
  controllerArg: ControllerInstance<any> | Controller<any> | "GENERIC",
  waterway: (c: ControllerInstance<any>, river: {
    head: typeof head,
    course: typeof course,
    join: typeof join
  }) => T
) {
  const controller = normalizeControllerArg(controllerArg)

  controller.waitForPressure = Infinity
  const ret = waterway(
    controller,
    {
      head,
      course,
      join
    }
  )
  forEachIterable(
    controller.sources,
    open
  )

  return ret
}
