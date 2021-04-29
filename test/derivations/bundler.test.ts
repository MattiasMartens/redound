import { stringLinesDerivation } from '@/derivations/string-lines'
import { expectationTest, expectationTestAsync, getDerivationEmitted } from '@test/helpers'
import * as expectations from './expectations.meta'
import {
  createReadStream
} from 'fs'
import { makeController } from '@/core'
import { head, join } from '@/current'
import { iterableSource } from '@/sources'
import { bundlerDerivation, namedBundlerDerivation } from '@/derivations'
import { eventCollectorSink } from '@/sinks'
import { scalarSort } from '@/patterns/arrays'
import { identity, pick } from '@/patterns/functions'

const sampleA = [1, 3, 9]
const sampleB = [10, 12, 14]
const sampleC = [91, 92, 93]

describe('bundler', () => {
  describe('bundlerDerivation', () => {
    it("emits whatever it receives from any of its sources", () => expectationTestAsync(
      expectations,
      "bundler",
      async () => {
        const controller = makeController()
        const sourceA = head(controller, iterableSource(sampleA))
        const sourceB = head(controller, iterableSource(sampleB))
        const sourceC = head(controller, iterableSource(sampleC))
        const sink = join(
          { sourceA, sourceB, sourceC },
          bundlerDerivation(),
          eventCollectorSink<number>()
        )

        const r = await sink.sinkResult()
        r.sort(scalarSort(identity))
        return r
      }
    ))
  })

  describe('namedBundlerDerivation', () => {
    it("emits what it receives, bundled with the role of the source", () => expectationTestAsync(
      expectations,
      "namedBundler",
      async () => {
        const controller = makeController()
        const sourceA = head(controller, iterableSource(sampleA))
        const sourceB = head(controller, iterableSource(sampleB))
        const sourceC = head(controller, iterableSource(sampleC))
        const sink = join(
          { sourceA, sourceB, sourceC },
          namedBundlerDerivation(),
          eventCollectorSink<{ payload: number, origin: string }>()
        )

        const r = await sink.sinkResult()
        r.sort(scalarSort(pick("payload")))
        return r
      }
    ))
  })
})