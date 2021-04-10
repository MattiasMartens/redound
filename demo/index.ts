import { initializeSinkInstance } from "@/core/sink";
import { initializeSourceInstance, subscribe } from "@/core/source";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { manualSourcePrototype } from "@/sources/manual";

export function main() {
  const sourceInstance = initializeSourceInstance(
    manualSourcePrototype()
  )
  const sinkInstance = initializeSinkInstance(
    consoleLogSinkPrototype(),
    sourceInstance
  )

  // TODO this shouldn't be necessary (should be implied in initializeSinkInstance) but the issue is that initializeSinkInstance can't call subscribe because subscribe is in source and that would create a dependency loop.
  subscribe(
    sourceInstance,
    sinkInstance
  )

  const { set } = getSome(
    sourceInstance.references
  )

  set(
    "Hello world!"
  )
}
