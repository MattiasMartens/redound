import {
  mappedDerivation
} from '@/derivations'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'
import * as expectations from './expectations.meta'

describe('derivations', () => {
  describe('mappedDerivation', () => {
    it("works good", () => expectationTestAsync(
      expectations,
      "scenario_base",
      () => getDerivationEmitted(
        mappedDerivation<string, string>(
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
