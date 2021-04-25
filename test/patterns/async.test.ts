import { iterateOverAsyncResult } from "@/patterns/async"
import { unaryCapture } from "@test/helpers"
import { constFalse } from "fp-ts/lib/function"
import { useFakeTimers, reset, SinonFakeTimers } from "sinon"

let clock: SinonFakeTimers
describe("async", () => {
  before(() => clock = useFakeTimers())

  describe("iterateOverAsyncResult", () => {
    it(
      "Iterates over a sync array",
      async () => {
        const {
          capture,
          captured
        } = unaryCapture<string>()

        await iterateOverAsyncResult(
          ["A", "B", "C"],
          capture,
          constFalse
        )
      }
    )
  })

  after(() => reset())
})