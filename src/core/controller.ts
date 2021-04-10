import { forEachIterable } from "@/patterns/iterables"
import { Controller } from "@/types/instances"
import { isNone, Option, some } from "fp-ts/lib/Option"

type ControllerReceiver<Finalization, Query> = {
  controller: Option<Controller<Finalization, Query>>
  consumers?: Set<ControllerReceiver<Finalization, Query>>,
  id: string
}

export async function propagateController<Finalization, Query>(
  component: ControllerReceiver<Finalization, Query>,
  controller: Controller<Finalization, Query>
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
