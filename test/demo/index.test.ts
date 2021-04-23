import * as demo from '@test/../demo'
import * as expectations from './expectations.meta'
import { expectationTestAsync } from '@test/helpers'

import {
  useFakeTimers,
  SinonFakeTimers
} from 'sinon'

async function captureLogOutput(fn: () => Promise<void>) {
  const originalConsoleLog = console.log
  const toCapture = [] as any[]
  global.console.log = (a: any) => {
    toCapture.push(a)
  }
  try {
    await fn()
  } finally {
    global.console.log = originalConsoleLog
  }

  return toCapture
}

let clock: SinonFakeTimers
function eventual<T>(fn: () => Promise<T>) {
  return () => {
    const promise = fn()
    clock?.tick(60 * 1000)
    return promise
  }
}

describe("demo", () => {
  before(() => clock = null as any && useFakeTimers())

  for (const exportedFunction in demo) {
    describe(exportedFunction, () => {
      it("Produces the expected output", async () => expectationTestAsync(
        expectations,
        exportedFunction,
        () => captureLogOutput(eventual(demo[exportedFunction]))
      ))
    })
  }
})
