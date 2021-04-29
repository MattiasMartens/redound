import { makeController, makeSink, makeSource } from "@/core"
import { flow, head } from "@/river"
import { mappedDerivation } from "@/derivations"
import { getSome } from "@/patterns/options"
import { eventCollectorSink } from "@/sinks"
import { iterableSource } from "@/sources"
import { strictEqual, deepStrictEqual } from "assert"

describe("current", () => {
  describe("head", () => {
    it("creates a source", async () => {
      const source = iterableSource([1, 2, 3])

      const headed = head(
        "NO_CONTROLLER",
        source
      )

      strictEqual(headed.prototype, source)
      const sink = makeSink(
        eventCollectorSink(),
        headed
      )

      const sinkResult = await sink.sinkResult()
      deepStrictEqual(
        sinkResult,
        [1, 2, 3]
      )
    })

    it("creates a source with controller", () => {
      const controller = makeController()
      const source = iterableSource([1, 2, 3])

      const headed = head(
        controller,
        source
      )

      strictEqual(getSome(headed.controller), controller)
    })

    it("creates a source with downstream derivation", async () => {
      const controller = makeController()
      const source = iterableSource([1, 2, 3])
      const derivation = mappedDerivation<number, string>(i => `The number in question is ${i}`)

      const headed = head(
        controller,
        source,
        derivation
      )

      strictEqual(getSome(headed.controller), controller)

      const sink = makeSink(
        eventCollectorSink(),
        headed
      )

      const sinkResult = await sink.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          "The number in question is 1",
          "The number in question is 2",
          "The number in question is 3"
        ]
      )
    })

    it("creates a source with downstream sink", async () => {
      const controller = makeController()
      const source = iterableSource([1, 2, 3])

      const headed = head(
        controller,
        source,
        eventCollectorSink()
      )

      strictEqual(getSome(headed.controller), controller)

      const sinkResult = await headed.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          1,
          2,
          3
        ]
      )
    })

    it("creates multiple derivations with a downstream sink", async () => {
      const controller = makeController()
      const source = iterableSource([1, 2, 3])
      const derivation = mappedDerivation<number, number>(i => i + 1)

      const headed = head(
        controller,
        source,
        derivation,
        derivation,
        derivation,
        eventCollectorSink<number>()
      )

      strictEqual(getSome(headed.controller), controller)

      const sinkResult = await headed.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          4,
          5,
          6
        ]
      )
    })
  })

  describe("flow", () => {
    it("links an emitter to a downstream derivation", async () => {
      const controller = makeController()
      const source = makeSource(iterableSource([1, 2, 3]), { controller })
      const derivation = mappedDerivation<number, string>(i => `The number in question is ${i}`)

      const flowed = flow(
        source,
        derivation
      )

      const sink = makeSink(
        eventCollectorSink(),
        flowed
      )

      const sinkResult = await sink.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          "The number in question is 1",
          "The number in question is 2",
          "The number in question is 3"
        ]
      )
    })

    it("links an emitter to a downstream sink", async () => {
      const controller = makeController()
      const source = makeSource(iterableSource([1, 2, 3]), { controller })
      const derivation = mappedDerivation<number, string>(i => `The number in question is ${i}`)

      const flowed = flow(
        source,
        derivation,
        eventCollectorSink()
      )

      const sinkResult = await flowed.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          "The number in question is 1",
          "The number in question is 2",
          "The number in question is 3"
        ]
      )
    })

    it("creates multiple derivations with a downstream sink", async () => {
      const controller = makeController()
      const source = makeSource(
        iterableSource([1, 2, 3]),
        { controller }
      )
      const derivation = mappedDerivation<number, number>(i => i + 1)

      const flowed = flow(
        source,
        derivation,
        derivation,
        derivation,
        eventCollectorSink<number>()
      )

      const sinkResult = await flowed.sinkResult()
      deepStrictEqual(
        sinkResult,
        [
          4,
          5,
          6
        ]
      )
    })
  })
})