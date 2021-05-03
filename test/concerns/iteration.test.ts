import { makeController } from "@/core"
import { course, courseIntoIterable, head } from "@/river"
import { mappedDerivation } from "@/derivations"
import { identity, noop } from "@/patterns/functions"
import { forEachSink } from "@/sinks"
import { iterableSource } from "@/sources"
import {
  deepStrictEqual,
  fail
} from 'assert'

const verify = it

const sample = ["tumbleweed", "haggis", "cormorant"]

describe("iteration", () => {
  verify("Can iterate over a bespoke source", async () => {
    const out: string[] = []

    const source = head("NO_CONTROLLER", iterableSource(sample))

    for await (const item of courseIntoIterable(source)) {
      out.push(item)
    }

    deepStrictEqual(out, sample)
  })
})