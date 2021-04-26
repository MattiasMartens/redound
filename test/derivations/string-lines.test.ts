import { stringLinesDerivation } from '@/derivations/string-lines'
import { expectationTestAsync, getDerivationEmitted } from '@test/helpers'
import * as expectations from './expectations.meta'
import {
  createReadStream
} from 'fs'

import {
  useFakeTimers,
  reset,
  SinonFakeTimers
} from 'sinon'

let clock: SinonFakeTimers
describe('derivations', () => {
  before(() => clock = useFakeTimers())

  describe('stringLinesDerivation', () => {
    it("collects partial lines into full lines", () => expectationTestAsync(
      expectations,
      "lines",
      () => getDerivationEmitted(
        stringLinesDerivation,
        [
          'f',
          'oo',
          '\n',
          'b',
          'ar\n',
          '\n'
        ]
      )
    ))

    it("splits chunks into lines", () => expectationTestAsync(
      expectations,
      "chunks",
      () => getDerivationEmitted(
        stringLinesDerivation,
        [
          'sphinx of black quartz: \njudge',
          ' my vow\n'
        ]
      )
    ))

    it("can be used on a readable file stream created by fs", () => expectationTestAsync(
      expectations,
      "file",
      () => getDerivationEmitted(
        stringLinesDerivation,
        createReadStream('./test/sources/sample.file',
          { encoding: 'utf8', highWaterMark: 1024 }
        )
      )
    ))
  })

  after(() => reset())
})
