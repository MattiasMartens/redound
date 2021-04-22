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

  const { set } = getSome(
    sourceInstance.references
  )

  set(
    "Hello world A!"
  )

  return controller.allSinksClosed()
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

  return controller.allSinksClosed()
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

  return controller.allSinksClosed()
}

export async function mainBackpressure() {
  const now = new Date().valueOf()
  let counter = 1

  function makeBackpressurableFunction() {
    const delay = Math.random()
    const id = counter++
    console.log(`Generated ${id} with delay ${delay.toFixed(2)}`)
    return () => {
      console.log(`Commencing ${id} with delay ${delay.toFixed(2)}`)

      return new Promise<void>(resolve => {
        setTimeout(() => {
          console.log(`Completed ${id} with delay ${delay.toFixed(2)} at ${((new Date().valueOf() - now) / 1000).toFixed(2)}s`)

          resolve()
        }, delay * 1000)
      })
    }
  }

  const backpressureInstance = backpressure()

  for (let i = 0; i < 10; i++) {
    await ms(Math.random() * 1250)
    applyToBackpressure(
      backpressureInstance,
      makeBackpressurableFunction()
    )
  }

  await applyToBackpressure(
    backpressureInstance,
    () => Promise.resolve()
  )
}
