import { chainAsyncResults, iterateOverAsyncResult, ms, PossiblyAsyncResult } from "@/patterns/async"
import { eventual, unaryCapture } from "@test/helpers"
import { constFalse } from "fp-ts/lib/function"
import { useFakeTimers, reset, SinonFakeTimers, restore } from "sinon"
import {
  deepStrictEqual
} from 'assert'
import { identity } from "@/patterns/functions"
import { mapIterable } from "@/patterns/iterables"

const stockSequence = ["durian", "lovage", "kohlrabi", "soapberry", "dragonfruit", "parsnip"]

async function* yieldAsyncIterable<T>(iter: Iterable<T>) {
  for (const i of iter) {
    await ms()
    yield i
  }
}

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
          stockSequence,
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )
      }
    )

    it(
      "Iterates over a sync array",
      async () => {
        const {
          capture,
          captured
        } = unaryCapture<string>()

        await iterateOverAsyncResult(
          new Set(stockSequence),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )
      }
    )

    it(
      "Iterates over an async array",
      async () => {
        const {
          capture,
          captured
        } = unaryCapture<string>()

        await iterateOverAsyncResult<string>(
          Promise.resolve(stockSequence),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )

        captured.splice(0)

        await iterateOverAsyncResult<string>(
          stockSequence.map(s => Promise.resolve(s)),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )

        captured.splice(0)

        await iterateOverAsyncResult<string>(
          Promise.resolve(
            stockSequence.map(s => Promise.resolve(s))
          ),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )
      }
    )

    it(
      "Iterates over an async iterable",
      () => eventual(clock, async () => {
        const {
          capture,
          captured
        } = unaryCapture<string>()

        await iterateOverAsyncResult(
          yieldAsyncIterable(stockSequence),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          stockSequence
        )
      })
    )

    it("Honours interrupts", () => eventual(clock, async () => {
      const {
        capture,
        captured
      } = unaryCapture<string>()

      await iterateOverAsyncResult(
        yieldAsyncIterable(stockSequence),
        capture,
        () => captured.length === 2
      )

      deepStrictEqual(
        captured,
        stockSequence.slice(0, 2)
      )

      captured.splice(0)

      await iterateOverAsyncResult(
        stockSequence,
        capture,
        () => captured.length === 2
      )

      deepStrictEqual(
        captured,
        stockSequence.slice(0, 2)
      )

      captured.splice(0)

      await iterateOverAsyncResult<string>(
        Promise.resolve(stockSequence),
        capture,
        () => captured.length === 2
      )

      deepStrictEqual(
        captured,
        stockSequence.slice(0, 2)
      )

      captured.splice(0)

      await iterateOverAsyncResult<string>(
        Promise.resolve(
          stockSequence.map(s => Promise.resolve(s))
        ),
        capture,
        () => captured.length === 2
      )

      deepStrictEqual(
        captured,
        stockSequence.slice(0, 2)
      )
    }))

    it("Waits for async processing to complete", () => eventual(clock, async () => {
      const {
        capture,
        captured
      } = unaryCapture<string>()

      await iterateOverAsyncResult(
        stockSequence,
        s => ms(5).then(() => capture(s)),
        () => captured.length === 2
      )

      deepStrictEqual(
        captured,
        stockSequence.slice(0, 2)
      )
    }))
  })

  describe(
    "chainAsyncResult",
    () => {
      it("Chains together async results", () => eventual(clock, async () => {
        const doubled = [...stockSequence, ...stockSequence]

        const {
          capture,
          captured
        } = unaryCapture<string>()

        await iterateOverAsyncResult(
          chainAsyncResults(
            yieldAsyncIterable(stockSequence),
            stockSequence
          ),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          doubled
        )

        captured.splice(0)

        await iterateOverAsyncResult(
          chainAsyncResults(
            yieldAsyncIterable(stockSequence),
            yieldAsyncIterable(stockSequence)
          ),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          doubled
        )

        captured.splice(0)

        await iterateOverAsyncResult(
          chainAsyncResults<string>(
            Promise.resolve(stockSequence),
            yieldAsyncIterable(stockSequence)
          ),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          doubled
        )

        captured.splice(0)

        await iterateOverAsyncResult<string>(
          chainAsyncResults(
            ...([
              undefined,
              stockSequence,
              Promise.resolve(undefined),
              stockSequence
            ] as PossiblyAsyncResult<string>[])
          ),
          capture,
          constFalse
        )

        deepStrictEqual(
          captured,
          doubled
        )
      }))
    }
  )

  after(() => restore())
})