import * as demo from '@test/../demo'
import * as expectations from './expectations.meta'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'

async function captureLogOutput(fn: () => Promise<void>) {
  const originalConsoleLog = console.log
  const toCapture = [] as any[]
  global.console.log = (a: any) => toCapture.push(a)
  try {
    await fn()
  } finally {
    global.console.log = originalConsoleLog
  }

  return toCapture
}

describe("demo", () => {
  for (const exportedFunction in demo) {
    describe(exportedFunction, () => expectationTestAsync(
      expectations,
      exportedFunction,
      () => captureLogOutput(demo[exportedFunction])
    ))
  }
})