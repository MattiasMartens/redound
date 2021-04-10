import { initializeSinkInstance } from "@/core/sink";
import { initializeSourceInstance } from "@/core/source";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { manualSourcePrototype } from "@/sources/manual";

const sourceInstance = initializeSourceInstance(
  manualSourcePrototype()
)
initializeSinkInstance(
  consoleLogSinkPrototype(),
  sourceInstance
)

const { set } = getSome(
  sourceInstance.references
)

set(
  "!!!"
)
