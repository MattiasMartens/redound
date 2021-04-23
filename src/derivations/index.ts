import { declareSimpleDerivation } from "@/core/derivation"
import { defaultDerivationSeal, unaryDerivationConsumer } from "@/core/helpers"
import { noop } from "@/patterns/functions"
import { Derivation } from "@/types/abstract"
import { EmitterInstanceAlias } from "@/types/instances"

export * from './stateful'

export type UnaryDerivation<I, O> = Derivation<{ main: EmitterInstanceAlias<I> }, O, any>

export function mappedDerivationPrototype<In, Out>(
  mapper: (i: In) => Out,
  {
    name = "Mapped"
  }: {
    name?: string
  } = {}
): Derivation<{
  main: EmitterInstanceAlias<In>
}, Out, void> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      i => ({ output: [mapper(i)], aggregate: undefined })
    ),
    seal: defaultDerivationSeal,
    close: noop,
    name,
    emits: new Set(/** TODO */),
    consumes: new Set(/** TODO */),
    open: noop,
    unroll: noop
  })
}

export function reducedDerivationPrototype<In, Out>(
  reducer: (acc: Out, i: In) => Out,
  initial: () => Out,
  {
    name = "Reduced"
  }: {
    name?: string
  } = {}
): Derivation<{
  main: EmitterInstanceAlias<In>
}, Out, void> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
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
    consumes: new Set(/** TODO */),
    unroll: noop
  })
}
