import { courseIntoIterable, head } from "@/river"
import { iterableSource } from "@/sources"
import {
  deepStrictEqual
} from 'assert'

const verify = it

const sample = ["tumbleweed", "haggis", "cormorant"]

describe("iteration", () => {
  verify("Can iterate over a bespoke source", async () => {
    const out: string[] = []

    const source = head("NO_CONTROLLER", iterableSource(sample))

    for await (const item of courseIntoIterable(source)) {
      debugger
      out.push(item)
    }

    deepStrictEqual(out, sample)
  })
})