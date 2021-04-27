import { Possible } from "@/types/patterns"
import {
  deepStrictEqual, doesNotReject
} from "assert"
import { iterableSource, UnaryDerivation, makeUnaryDerivation, makeSource, makeSink, eventCollectorSink, makeController, tupleFirst } from "@/index"
import { ms, PossiblyAsyncResult } from "@/patterns/async"
import Sinon = require("sinon")

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
  const p = fn()
  const result = await p
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

  const sourceInstance = makeSource(iterableSource(input), { controller: controllerInstance })
  const derivationInstance = makeUnaryDerivation(
    derivation,
    sourceInstance
  )

  const sink = makeSink(
    eventCollectorSink(),
    derivationInstance
  )

  return sink.sinkResult()
}

export function unaryCapture<T>() {
  const captured = [] as T[]

  return {
    capture: (t: T) => void captured.push(t),
    captured
  }
}

export async function eventual<T>(clock: Sinon.SinonFakeTimers, fn: () => Promise<T>) {
  const promise = fn()

  const clockRunPromise = clock && clock.runAllAsync()
  const tuple = await Promise.all([
    promise,
    clockRunPromise
  ])
  return tupleFirst(tuple)
}

export type TestSequence<T> = (T | { tag: "throw", error: Error } | { tag: "wait", ms: number })[]

async function* asyncGeneratorFromTestSequence<T>(seq: TestSequence<T>) {
  for (const item of seq) {
    if (("tag" in item) && item.tag === "throw") {
      throw item.error
    } else if (("tag" in item) && item.tag === "wait") {
      await ms(item.ms)
    } else {
      yield item
    }
  }
}

export function testSourceSequence<T>(seq: TestSequence<T>) {
  return iterableSource(
    asyncGeneratorFromTestSequence(seq)
  )
}
