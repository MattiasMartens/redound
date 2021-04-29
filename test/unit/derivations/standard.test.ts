import {
  flatMappedDerivation,
  mappedDerivation
} from '@/derivations'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'
import * as expectations from './expectations.meta'

async function* yieldAsyncStar<T>(t: T[]) {
  yield* t
}

describe('derivations', () => {
  describe('mappedDerivation', () => {
    it('emits one mapped output per input', () => expectationTestAsync(
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

  describe('flatMappedDerivation', () => {
    it("emits one output per item in the mapped result", () => expectationTestAsync(
      expectations,
      "flatMappedDerivationIterable",
      () => getDerivationEmitted(
        flatMappedDerivation<string, string>(
          s => s.split(";")
        ),
        [
          "zzy",
          "foo;bar"
        ]
      )
    ))

    it("emits one output if mapped result is not iterable", () => expectationTestAsync(
      expectations,
      "flatMappedDerivationNonIterable",
      () => getDerivationEmitted(
        flatMappedDerivation<string, string>(
          s => s.toUpperCase()
        ),
        [
          "Jethro",
          "koala"
        ]
      )
    ))

    it("emits one output per item of async output", () => expectationTestAsync(
      expectations,
      "flatMappedDerivationIterableAsync",
      () => getDerivationEmitted(
        flatMappedDerivation<string, string>(
          s => yieldAsyncStar(s.split(" "))
        ),
        [
          "it was a pleasant day to begin a",
          "book"
        ]
      )
    ))
  })
})
