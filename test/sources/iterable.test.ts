import { makeSink, makeSource } from "@/core"
import { eventCollectorSink } from "@/sinks"
import { iterableSource } from "@/sources"
import {
  deepStrictEqual
} from 'assert'

describe(
  "iterableSource",
  () => {
    it("Emits data from an Array", async () => {
      const source = makeSource(iterableSource(["A", "B", "C"]))
      const sink = makeSink(
        eventCollectorSink(),
        source
      )

      const result = await sink.sinkResult()
      deepStrictEqual(result, ['A', 'B', 'C'])
    })
  }
)