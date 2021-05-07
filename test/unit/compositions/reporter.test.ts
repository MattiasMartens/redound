import {
  makeReporter
} from '@/compositions'
import { makeController } from '@/core'
import { mappedDerivation } from '@/derivations'
import { noop } from '@/patterns/functions'
import { getSome } from '@/patterns/options'
import { course, head } from '@/river'
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

describe(
  "reporter",
  () => {
    it("Passes events from an emitter to a sink", async () => {
      const derivation = head(
        "NO_CONTROLLER",
        iterableSource(["A", "B", "C"]),
        mappedDerivation((s: string) => s + s)
      )

      const controller = makeController()
      const { reporter, listen, stopListening } = makeReporter(controller, derivation)

      listen(derivation)

      const finalNotificationSink = course(
        reporter,
        eventCollectorSink()
      )

      const originalSink = course(
        derivation,
        forEachSink(noop)
      )

      await originalSink.sinkResult()
      const aggregation = getSome(finalNotificationSink.references)
      deepStrictEqual(
        aggregation,
        ["AA", "BB", "CC"]
      )

      stopListening()
    })

    it("Does not couple controller", async () => {
      const controller = makeController()
      const controller2 = makeController()

      const derivation = head(
        controller,
        iterableSource(["A", "B", "C"]),
        mappedDerivation((s: string) => s + s)
      )

      const { reporter, listen, stopListening } = makeReporter(controller2, derivation)

      listen(derivation)

      const finalNotificationSink = course(
        reporter,
        eventCollectorSink()
      )

      const originalSink = course(
        derivation,
        forEachSink(noop)
      )

      notStrictEqual(
        getSome(finalNotificationSink.controller),
        getSome(originalSink.controller)
      )
    })

    it("Does not couple lifecycle", async () => {
      const derivation = head(
        "NO_CONTROLLER",
        iterableSource(["A", "B", "C"]),
        mappedDerivation((s: string) => s + s)
      )

      const controller = makeController()
      const { reporter, listen, stopListening } = makeReporter(controller, derivation)

      listen(derivation)

      const finalNotificationSink = course(
        reporter,
        eventCollectorSink()
      )

      const originalSink = course(
        derivation,
        forEachSink(noop)
      )

      await originalSink.sinkResult()

      notStrictEqual(
        finalNotificationSink.lifecycle.state,
        "ENDED"
      )

      stopListening()

      await getSome(reporter.controller).promisedOutcome()
      strictEqual(
        finalNotificationSink.lifecycle.state,
        "ENDED"
      )
    })
  }
)
