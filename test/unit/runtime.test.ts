import {
  throws,
  doesNotThrow
} from 'assert'

import { registerKey } from "@/runtime"

describe(
  "runtime",
  () => {
    describe("registerKey", () => {
      it("Throws an error if a key is registered more than once", () => {
        registerKey('foo')

        throws(
          () => registerKey('foo')
        )
      })

      it("Throws no error if different keys are registered", () => {
        registerKey('bar')

        doesNotThrow(
          () => registerKey('bar2')
        )
      })
    })
  }
)