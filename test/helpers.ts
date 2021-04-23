import { Possible } from "@/types/patterns"
import {
  deepStrictEqual
} from "assert"
import { iterableSourcePrototype, UnaryDerivation, makeUnaryDerivation, makeSource, makeSink, eventCollectorPrototype, makeController } from "@/index"
import { PossiblyAsyncResult } from "@/patterns/async"

export function expectationTest<T>(expectationsImport: any, scenarioKey: string, fn: () => T) {
  const generated = expectationsImport[scenarioKey] as Possible<T>
  if (generated) {
    deepStrictEqual(
      generated,
      fn()
    )
  } else {
    const expectation = fn()
    throw new Error(`No expectation found for ${scenarioKey}, load the generated output into the expectations.meta.ts file:\nexport const ${scenarioKey} = ${typeof expectation === 'string' ? "`" + expectation + "`" : JSON.stringify(expectation, null, 2)}`)
  }
}

export async function expectationTestAsync(expectationsImport: any, scenarioKey: string, fn: () => Promise<any>) {
  const result = await fn()
  return expectationTest(
    expectationsImport,
    scenarioKey,
    () => result
  )
}

export function getDerivationEmitted<I, O>(
  derivation: UnaryDerivation<I, O>,
  input: PossiblyAsyncResult<I>
) {
  const controllerInstance = makeController(
    {
      name: "Test"
    }
  )

  const sourceInstance = makeSource(iterableSourcePrototype(input), { controller: controllerInstance })
  const derivationInstance = makeUnaryDerivation(
    derivation,
    sourceInstance
  )

  const sink = makeSink(
    eventCollectorPrototype(),
    derivationInstance
  )

  return sink.sinkResult()
}
