import { makeManual } from '@/compositions'
import { mappedDerivation } from '@/derivations'
import { ms } from '@/patterns/async'
import { course } from '@/river'
import { eventCollectorSink } from '@/sinks'
import { eventual } from '@test/helpers'
import { deepStrictEqual } from 'assert'
import { restore, SinonFakeTimers, useFakeTimers } from 'sinon'

let clock: SinonFakeTimers
describe(
  'manualSource', () => {
    before(() => clock = useFakeTimers())

    it('Emits the input and ends when end() is called', async () => {
      const {
        source,
        end,
        set
      } = makeManual('NO_CONTROLLER')

      const output = course(
        source,
        eventCollectorSink()
      )

      set(1)
      set(2)
      set(4)
      end()

      const result = await output.sinkResult()

      deepStrictEqual(result, [1, 2, 4])
    })

    it('Returns a Promise representing backpressure', () => eventual(clock, async () => {
      const {
        source,
        end,
        set
      } = makeManual('NO_CONTROLLER')
      clock.setSystemTime(0)

      const output = course(
        source,
        mappedDerivation(async i => ms(100).then(() => i)),
        eventCollectorSink()
      )

      set(clock.now + 1)
      await set(clock.now + 2)
      await set(clock.now + 4)
      await set(clock.now + 8)
      end()

      const result = await output.sinkResult()

      deepStrictEqual(result, [1, 2, 204, 308])
    }))

    after(() => restore())
  }
)
