import { declareSimpleDerivation } from "@/core/derivation"
import { defaultDerivationSeal, unaryDerivationConsumer } from "@/core/helpers"
import { noop } from "@/patterns/functions"
import { Derivation } from "@/types/abstract"
import { EmitterInstanceAlias } from "@/types/instances"

export function mappedDerivationPrototype<In, Out>(
  mapper: (i: In) => Out,
  {
    name = "Mapped"
  }: {
    name?: string
  } = {}
): Derivation<{
  main: EmitterInstanceAlias<In>
}, Out, void, any> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      i => ({ payload: [mapper(i)], aggregate: undefined })
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

export function statefulDerivationPrototype<In, State, Out>(
  transformer: (i: In, s: State) => { state: State, payload: Out[] },
  initial: () => State,
  {
    name = "Reduced",
    seal
  }: {
    name?: string,
    seal?: (s: State) => Out[]
  } = {}
): Derivation<{
  main: EmitterInstanceAlias<In>
}, Out, State, any> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      (i, acc) => {
        const { state, payload } = transformer(i, acc)

        return {
          payload,
          aggregate: state
        }
      }
    ),
    open: initial,
    close: noop,
    seal: (params) => ({
      ...defaultDerivationSeal(params),
      ...seal && {
        output: seal(params.aggregate).map(payload => ({
          payload,
          type: "ADD",
          species: "Seal",
          eventScope: "ROOT"
        }))
      }
    }),
    name,
    emits: new Set(/** TODO */),
    consumes: new Set(/** TODO */),
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
}, Out, void, any> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      (i, acc) => {
        const reduced = reducer(acc, i)

        return {
          payload: [reduced],
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
