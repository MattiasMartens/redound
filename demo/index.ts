import { makeSource } from "@/core";
import { makeDerivation, makeSink, makeUnaryDerivation } from "@/core/orchestrate";
import { mappedDerivationPrototype } from "@/derivations/map";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { iterableSourcePrototype } from "@/sources/iterable";
import { manualSourcePrototype } from "@/sources/manual";

export function mainA() {
  const sourceInstance = makeSource(
    manualSourcePrototype()
  )

  makeSink(
    sourceInstance,
    consoleLogSinkPrototype()
  )

  const { set } = getSome(
    sourceInstance.references
  )

  set(
    "Hello world A!"
  )
}

export function mainB() {
  const sourceInstance = makeSource(
    iterableSourcePrototype(["Hello world B!"])
  )

  makeSink(
    sourceInstance,
    consoleLogSinkPrototype()
  )
}

export function mainC() {
  const sourceInstance = makeSource(
    iterableSourcePrototype([5, 8, 13])
  )

  const derivationInstance = makeUnaryDerivation(
    sourceInstance,
    mappedDerivationPrototype(
      x => `Hello world C-${x}!`
    )
  )

  makeSink(
    derivationInstance,
    consoleLogSinkPrototype(),
  )
}
