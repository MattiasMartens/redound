import { makeController, makeSource } from "@/core"
import { makeSink, makeUnaryDerivation } from "@/core"
import { mappedDerivation } from "@/derivations"
import { getSome } from "@/patterns/options"
import { consoleLogSink } from "@/sinks/console-logger"
import { iterableSource } from "@/sources/iterable"
import { manualSource } from "@/sources/manual"

export function mainA() {
  const controller = makeController()

  const sourceInstance = makeSource(
    manualSource(),
    { controller }
  )

  makeSink(
    consoleLogSink(),
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
    iterableSource(["Hello world B!"]),
    { controller }
  )

  makeSink(
    consoleLogSink(),
    sourceInstance
  )

  return controller.awaitOutcome()
}

export function mainC() {
  const controller = makeController()

  const sourceInstance = makeSource(
    iterableSource([5, 8, 13]),
    {
      controller
    }
  )

  const derivationInstance = makeUnaryDerivation(
    mappedDerivation(
      x => `Hello world C-${x}!`
    ),
    sourceInstance
  )

  makeSink(
    consoleLogSink(),
    derivationInstance
  )

  return controller.awaitOutcome()
}
