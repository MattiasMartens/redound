import { applyToBackpressure, backpressure } from "@/core/backpressure"
import { ms } from "@/patterns/async"

import * as expectations from './expectations.meta'
import { expectationTestAsync, eventual } from '@test/helpers'

import {
  useFakeTimers,

  SinonFakeTimers,
  restore
} from 'sinon'
import { tupleFirst } from "@/sources"

let clock: SinonFakeTimers
describe("backpressure", () => {
  before(() => clock = useFakeTimers())

  it("Always executes Promises in order and never commences one Promise function while another is still executing", () => expectationTestAsync(
    expectations,
    "sequential",
    () => eventual(clock, async () => {
      const seq: {
        id: number,
        state: "COMMENCING" | "COMPLETED"
      }[] = []

      let counter = 1

      function makeBackpressurableFunction() {
        const delay = Math.random() * 10
        const id = counter++
        return () => {
          seq.push({
            id,
            state: "COMMENCING"
          })

          return new Promise<void>(resolve => {
            setTimeout(() => {
              seq.push({
                id,
                state: "COMPLETED"
              })

              resolve()
            }, delay)
          })
        }
      }

      const backpressureInstance = backpressure()

      for (let i = 0; i < 10; i++) {
        await ms(Math.random() * 12)
        applyToBackpressure(
          backpressureInstance,
          makeBackpressurableFunction()
        )
      }

      await applyToBackpressure(
        backpressureInstance,
        () => Promise.resolve()
      )

      return seq
    }))
  )

  after(() => restore())
})
