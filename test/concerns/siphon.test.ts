import { makeController, makeSink, makeSource } from '@/core'
import { timeout } from '@/patterns/async'
import { noop } from '@/patterns/functions'
import { eventCollectorSink, forEachSink } from '@/sinks'
import { iterableSource } from '@/sources'
import { eventual } from '@test/helpers'
import {
  deepStrictEqual,
  rejects,
  doesNotReject
} from 'assert'
import {
  useFakeTimers,
  SinonFakeTimers,
  restore
} from 'sinon'

const verify = it

const sample = [30, 39, 51]

let clock: SinonFakeTimers
describe(
  "siphon",
  () => {
    before(() => clock = useFakeTimers())

    verify("Sinks with siphon set to false do not activate source", () => eventual(clock, async () => {
      const source = makeSource(iterableSource(sample))
      const sink = makeSink(eventCollectorSink(), source, { siphon: false })

      return rejects(
        timeout(sink.sinkResult(), 100)
      )
    }))

    verify("Sinks with siphon set to true do activate source", () => eventual(clock, async () => {
      const source = makeSource(iterableSource(sample))
      const sink = makeSink(eventCollectorSink(), source, { siphon: false })

      makeSink(forEachSink(noop), source)

      const nonPressuringSinkResult = await sink.sinkResult()

      deepStrictEqual(nonPressuringSinkResult, sample)
    }))

    verify("Sink with siphon pressure does not activate source if source controller has waitForPressure of 2", () => eventual(clock, async () => {
      const controller = makeController({ waitForPressure: 2 })
      const source = makeSource(iterableSource(sample), { controller })
      const sink = makeSink(eventCollectorSink(), source)

      return rejects(
        timeout(sink.sinkResult(), 100)
      )
    }))

    verify("Two sinks, but only one with siphon pressure, does not activate source if source controller has waitForPressure of 2", () => eventual(clock, async () => {
      const controller = makeController({ waitForPressure: 2 })
      const source = makeSource(iterableSource(sample), { controller })
      const sink = makeSink(eventCollectorSink(), source, { siphon: false })

      makeSink(forEachSink(noop), source)

      return rejects(
        timeout(sink.sinkResult(), 100)
      )
    }))

    verify("Two siphoning sinks activate source if source controller has waitForPressure of 2", () => eventual(clock, async () => {
      const controller = makeController({ waitForPressure: 2 })
      const source = makeSource(iterableSource(sample), { controller })
      const sink = makeSink(eventCollectorSink(), source)

      makeSink(forEachSink(noop), source)

      const nonPressuringSinkResult = await sink.sinkResult()

      deepStrictEqual(nonPressuringSinkResult, sample)
    }))

    after(() => restore())
  }
)
