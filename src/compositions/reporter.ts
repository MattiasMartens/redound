import { makeController, makeSource } from "@/core"
import { open } from "@/core/source"
import { lazy } from "@/patterns/functions"
import { getSome } from "@/patterns/options"
import { course } from "@/river"
import { forEachSink } from "@/sinks"
import { manualSource } from "@/sources"
import { Controller } from "@/types/abstract"
import { ControllerInstance, Emitter } from "@/types/instances"

function normalizeControllerArg(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER"
) {
  if (controller === "NO_CONTROLLER") {
    return undefined
  } else if ("prototype" in controller) {
    return controller
  } else {
    return makeController(controller)
  }
}

export function makeReporter<T>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  params: { id?: string } = {}
) {
  const sourceInstance = makeSource(manualSource<T>(), { ...params, controller: normalizeControllerArg(controller) })

  const manualControls = lazy(() => {
    // NOTE I do not like how imperative this is...
    // Fortunately the case is simple
    if (sourceInstance.lifecycle.state === "READY") {
      open(sourceInstance)
    }
    return getSome(sourceInstance.references)
  })

  const listen = (emitterInstance: Emitter<T>) => {
    return course(
      emitterInstance,
      {
        wrapped: forEachSink<T>(t => void manualControls().set(t)),
        siphon: false
      }
    )
  }

  return {
    reporter: sourceInstance,
    listen,
    stopListening: () => manualControls().end()
  }
}
