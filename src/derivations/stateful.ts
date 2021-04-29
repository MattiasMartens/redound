import { defaultDerivationSeal, unaryDerivationConsumer } from "@/core"
import { declareSimpleDerivation } from "@/core/derivation"
import { PossiblyAsyncResult } from "@/patterns/async"
import { noop } from "@/patterns/functions"
import { Derivation } from "@/types/abstract"
import { Emitter } from "@/types/instances"

export function statefulDerivation<In, Out, State>(
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
  main: Emitter<In>
}, Out, State> {
  return declareSimpleDerivation<{ main: Emitter<In> }, Out, State>({
    consume: unaryDerivationConsumer<In, Out, State>(
      (i, acc) => {
        const { state, output } = transformer(i, acc)

        return {
          output,
          aggregate: state
        }
      }
    ),
    open: initial,
    seal: (params) => ({
      ...defaultDerivationSeal(params),
      ...seal && {
        output: seal(params.aggregate)
      }
    }),
    name
  })
}
