import { makeSink, makeSource } from "@/core"
import { nodeWritableSink } from "@/sinks/node-writable"
import { iterableSource } from "@/sources"
import { PassThrough } from 'stream'
import {
  deepStrictEqual
} from 'assert'

describe("nodeWritableSink", () => {
  it("Writes input to a Node writable stream", async () => {
    const source = makeSource(iterableSource(["A", "B", "C"]))
    const writable = new PassThrough()
    const sink = makeSink(
      nodeWritableSink(writable),
      source
    )

    const captured: string[] = []

    writable.on('data', (d) => captured.push(String(d)))

    await sink.sinkResult()

    await new Promise(resolve => {
      writable.on('end', resolve)
    })

    deepStrictEqual(
      captured,
      ["A", "B", "C"]
    )
  })
})