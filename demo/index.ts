import { makeSource } from "@/core";
import { makeSink } from "@/core/orchestrate";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { iterableSourcePrototype } from "@/sources/iterable";
import { manualSourcePrototype } from "@/sources/manual";

export function mainA() {
  const sourceInstance = makeSource(
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
    "Hello world A!"
  )
}

export function main() {
  const sourceInstance = makeSource(
    iterableSourcePrototype(["Hello world!"])
  )

  makeSink(
    consoleLogSinkPrototype(),
    sourceInstance
  )
}
