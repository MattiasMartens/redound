import { defaultDerivationSeal, unaryDerivationConsumer } from "@/core"
import { declareSimpleDerivation } from "@/core/derivation"
import { PossiblyAsyncResult } from "@/patterns/async"
import { noop } from "@/patterns/functions"
import { Derivation } from "@/types/abstract"
import { EmitterInstanceAlias } from "@/types/instances"

export function statefulDerivationPrototype<In, Out, State>(
  transformer: (i: In, s: State) => { state: State, output: PossiblyAsyncResult<Out> },
  initial: () => State,
  {
    name = "Reduced",
    seal
  }: {
    name?: string,
    seal?: (s: State) => PossiblyAsyncResult<Out>
  } = {}
): Derivation<{
  main: EmitterInstanceAlias<In>
}, Out, State> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      (i, acc) => {
        const { state, output } = transformer(i, acc)

        return {
          output,
          aggregate: state
        }
      }
    ),
    open: initial,
    close: noop,
    seal: (params) => ({
      ...defaultDerivationSeal(params),
      ...seal && {
        output: seal(params.aggregate)
      }
    }),
    name,
    emits: new Set(/** TODO */),
    consumes: new Set(/** TODO */),
    unroll: noop
  })
}
