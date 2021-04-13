import { makeSource } from "@/core";
import { applyToBackpressure, backpressure } from "@/core/backpressure";
import { makeDerivation, makeSink, makeUnaryDerivation } from "@/core/orchestrate";
import { mappedDerivationPrototype } from "@/derivations/map";
import { ms } from "@/patterns/async";
import { getSome } from "@/patterns/options";
import { consoleLogSinkPrototype } from "@/sinks/console-logger";
import { iterableSourcePrototype } from "@/sources/iterable";
import { manualSourcePrototype } from "@/sources/manual";
import { v4 as uuid } from "uuid";

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
}
