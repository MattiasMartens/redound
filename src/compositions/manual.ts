import { makeController, makeSource } from "@/core"
import { lazy } from "@/patterns/functions"
import { getSome } from "@/patterns/options"
import { manualSource } from "@/sources"
import { Controller } from "@/types/abstract"
import { ControllerInstance } from "@/types/instances"

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

export function makeManual<T>(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  params: { id?: string } = {}
) {
  const source = makeSource(manualSource<T>(), { ...params, controller: normalizeControllerArg(controller) })
  const methods = lazy(() => getSome(source.references, 'Tried to write to a manual source before it was opened. Attach a sink to this source first.'))
  const set = (t: T) => methods().set(t)
  const end = () => methods().end()

  return {
    source,
    set,
    end
  }
}
