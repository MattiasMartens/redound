import { makeSink } from "@/core/orchestrate";
import { initializeSourceInstance, subscribe } from "@/core/source";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { manualSourcePrototype } from "@/sources/manual";

export function main() {
  const sourceInstance = initializeSourceInstance(
    manualSourcePrototype()
  )

  makeSink(
    consoleLogSinkPrototype(),
    sourceInstance
  )

  const { set } = getSome(
    sourceInstance.references
  )

  set(
    "Hello world!"
  )
}
