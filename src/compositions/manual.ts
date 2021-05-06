import { makeController, makeSource } from "@/core"
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
  const {
    end,
    set
  } = getSome(source.references)

  return {
    source,
    set,
    end
  }
}
