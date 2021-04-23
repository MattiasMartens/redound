import { makeSink, makeSource } from "@/core"
import { eventCollectorPrototype } from "@/sinks"
import { iterableSourcePrototype } from "@/sources"
import {
  deepStrictEqual
} from 'assert'

describe(
  "iterableSourcePrototype",
  () => {
    it("Emits data from an Array", async () => {
      const source = makeSource(iterableSourcePrototype(["A", "B", "C"]))
      const sink = makeSink(
        eventCollectorPrototype(),
        source
      )

      const result = await sink.sinkResult()
      deepStrictEqual(result, ['A', 'B', 'C'])
    })
  }
)