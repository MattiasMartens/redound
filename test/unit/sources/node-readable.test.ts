import { makeSink, makeSource } from "@/core"
import { eventCollectorSink } from "@/sinks"
import { nodeReadableSource } from "@/sources/node-readable"
import {
  Readable
} from "stream"
import {
  deepStrictEqual
} from 'assert'
import {
  createReadStream
} from 'fs'

describe(
  "nodeReadableSource",
  () => {
    it("Emits data from a Node Readable stream", async () => {
      const nodeStream = Readable.from(["A", "B", "C"])

      const source = makeSource(nodeReadableSource(nodeStream))
      const sink = makeSink(
        eventCollectorSink(),
        source
      )

      const result = await sink.sinkResult()
      deepStrictEqual(result, ['A', 'B', 'C'])
    })

    it("Emits data that was read from a file using fs", async () => {
      const nodeStream = createReadStream('./test/fixtures/sample.file',
        { encoding: 'utf8', highWaterMark: 1024 }
      )

      const source = makeSource(
        nodeReadableSource(nodeStream)
      )
      const sink = makeSink(
        eventCollectorSink(),
        source
      )

      const result = await sink.sinkResult()
      deepStrictEqual(result.join(""), "Line 1\nLine 2\nLine 3\n")
    })
  }
)