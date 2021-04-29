import { declareSimpleDerivation } from "@/core/derivation"
import { defaultDerivationSeal, unaryDerivationConsumer } from "@/core/helpers"
import { noop } from "@/patterns/functions"
import { Derivation } from "@/types/abstract"
import { Emitter } from "@/types/instances"

export * from './stateful'
export * from './string-lines'
export * from './bundler'

export type UnaryDerivation<I, O> = Derivation<{ main: Emitter<I> }, O, any>

export function mappedDerivation<In, Out>(
  mapper: (i: In) => Out,
  {
    name = "Mapped"
  }: {
    name?: string
  } = {}
): Derivation<{
  main: Emitter<In>
}, Out, void> {
  return declareSimpleDerivation<{ main: Emitter<In> }, Out, void>({
    consume: unaryDerivationConsumer(
      i => ({ output: [mapper(i)], aggregate: noop() })
    ),
    seal: defaultDerivationSeal,
    close: noop,
    name,
    emits: new Set(/** TODO */),
    consumes: {
      main: new Set(/** TODO */)
    },
    open: noop,
    unroll: noop
  })
}

export function reducedDerivation<In, Out>(
  reducer: (acc: Out, i: In) => Out,
  initial: () => Out,
  {
    name = "Reduced"
  }: {
    name?: string
  } = {}
): Derivation<{
  main: Emitter<In>
}, Out, Out> {
  return declareSimpleDerivation<{ main: Emitter<In> }, Out, Out>({
    consume: unaryDerivationConsumer<In, Out, Out>(
      (i, acc) => {
        const reduced = reducer(acc, i)

        return {
          output: [reduced],
          aggregate: reduced
        }
      }
    ),
    open: initial,
    seal: defaultDerivationSeal,
    close: noop,
    name,
    emits: new Set(/** TODO */),
    consumes: {
      main: new Set(/** TODO */)
    },
    unroll: noop
  })
}
