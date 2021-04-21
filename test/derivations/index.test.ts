import {
  mappedDerivationPrototype
} from '@/derivations'
import { getRight } from '@/patterns/either'
import { pick } from '@/patterns/functions'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'
import { flow } from 'fp-ts/lib/function'
import * as expectations from './expectations.meta'

describe('derivations', () => {
  describe('mappedDerivationPrototype', () => {
    it("works good", () => expectationTestAsync(
      expectations,
      "scenario_base",
      () => getDerivationEmitted(
        mappedDerivationPrototype<string, string>(
          s => s.toUpperCase()
        ),
        [
          "AaA",
          "bBb"
        ]
      ).then(
        flow(
          getRight,
          pick("finalization")
        )
      )
    ))
  })
})
