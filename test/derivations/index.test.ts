import {
  mappedDerivationPrototype
} from '@/derivations'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'
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
      )
    ))
  })
})
