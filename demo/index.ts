import { makeController, makeSource } from "@/core"
import { applyToBackpressure, backpressure } from "@/core/backpressure"
import { makeSink, makeUnaryDerivation } from "@/core"
import { mappedDerivationPrototype } from "@/derivations"
import { ms } from "@/patterns/async"
import { getSome } from "@/patterns/options"
import { consoleLogSinkPrototype } from "@/sinks/console-logger"
import { iterableSourcePrototype } from "@/sources/iterable"
import { manualSourcePrototype } from "@/sources/manual"

export function mainA() {
  const controller = makeController()

  const sourceInstance = makeSource(
    manualSourcePrototype(),
    { controller }
  )

  makeSink(
    consoleLogSinkPrototype(),
    sourceInstance
  )

  const { set, end } = getSome(
    sourceInstance.references
  )

  set(
    "Hello world A!"
  )

  end()

  return controller.awaitOutcome()
}

export function mainB() {
  const controller = makeController()

  const sourceInstance = makeSource(
    iterableSourcePrototype(["Hello world B!"]),
    { controller }
  )

  makeSink(
    consoleLogSinkPrototype(),
    sourceInstance
  )

  return controller.awaitOutcome()
}

export function mainC() {
  const controller = makeController()

  const sourceInstance = makeSource(
    iterableSourcePrototype([5, 8, 13]),
    {
      controller
    }
  )

  const derivationInstance = makeUnaryDerivation(
    mappedDerivationPrototype(
      x => `Hello world C-${x}!`
    ),
    sourceInstance
  )

  makeSink(
    consoleLogSinkPrototype(),
    derivationInstance
  )

  return controller.awaitOutcome()
}
