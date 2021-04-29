import { controller, makeController, makeSource, makeUnaryDerivation } from "@/core"
import { flow, head } from "@/river"
import { mappedDerivation } from "@/derivations"
import { identity, noop } from "@/patterns/functions"
import { forEachSink } from "@/sinks"
import { iterableSource } from "@/sources"
import {
  deepStrictEqual,
  fail
} from 'assert'
import { assert } from "sinon"

const verify = it

const sample = ["tumbleweed", "haggis", "cormorant"]

describe("iteration", () => {
  verify("Can iterate over a bespoke source", async () => {
    const out: string[] = []

    for await (const item of head("NO_CONTROLLER", iterableSource(sample))) {
      out.push(item)
    }

    deepStrictEqual(out, sample)
  })

  verify("Fails on a source that is already under a controller", async () => {
    const out: string[] = []

    let threw = false
    try {
      for await (const item of head(makeController(), iterableSource(sample))) {
        out.push(item)
      }
    } catch (e) {
      threw = true
    }

    threw || fail("Should have thrown")
  })

  verify("Fails on a source that already has subscribers", async () => {
    const out: string[] = []

    const source = head("NO_CONTROLLER", iterableSource(sample))
    flow(
      source,
      mappedDerivation(identity),
      forEachSink(noop)
    )

    let threw = false
    try {
      for await (const item of source) {
        out.push(item)
      }
    } catch (e) {
      threw = true
    }

    threw || fail("Should have thrown")
  })
})