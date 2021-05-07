import {
  makeReporter, socket
} from '@/compositions'
import { makeController } from '@/core'
import { flatMappedDerivation, mappedDerivation } from '@/derivations'
import { collectAsyncResult } from '@/patterns/async'
import { noop } from '@/patterns/functions'
import { getSome } from '@/patterns/options'
import { course, courseIntoIterable, head } from '@/river'
import { eventCollectorSink, forEachSink } from '@/sinks'
import { iterableSource } from '@/sources'

import {
  strictEqual,
  deepStrictEqual,
  notStrictEqual,
  rejects,
  doesNotReject
} from 'assert'
import {
  useFakeTimers,
  SinonFakeTimers,
  restore
} from 'sinon'

const sample = {
  fibonacci: [1, 1, 2, 3, 5, 8],
  square: [1, 4, 9, 16, 25],
  cube: [1, 8, 27, 64]
}

describe(
  "socket",
  () => {
    it("Exposes a query function and a source-sink graph component pair", async () => {
      const controller = makeController()

      const {
        send,
        sink,
        sourceInstance
      } = socket<string, string>(controller)

      course(
        sourceInstance,
        mappedDerivation<string, string>(s => s.toLowerCase()),
        sink
      )

      const output = await collectAsyncResult(
        send("myquery", "A1000")
      )

      deepStrictEqual(
        output,
        ["myquery"]
      )

      controller.close()
      await controller.promisedOutcome()
    })

    it("Works with interleaved queries", async () => {
      const controller = makeController()

      const {
        send,
        sink,
        sourceInstance
      } = socket<string, string>(controller)

      course(
        sourceInstance,
        flatMappedDerivation<string, string>(s => sample[s]),
        sink
      )

      const output1Promise = collectAsyncResult(
        send("fibonacci", "B1000")
      )
      const output2Promise = collectAsyncResult(
        send("square", "B1001")
      )
      const output3Promise = collectAsyncResult(
        send("cube", "B1002")
      )

      const [
        output1,
        output2,
        output3
      ] = await Promise.all([output1Promise, output2Promise, output3Promise])

      deepStrictEqual(
        output1,
        sample.fibonacci
      )

      deepStrictEqual(
        output2,
        sample.square
      )

      deepStrictEqual(
        output3,
        sample.cube
      )

      controller.close()
      await controller.promisedOutcome()
    })
  }
)
