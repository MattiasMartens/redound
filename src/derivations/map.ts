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
}, Out, void, any, any> {
  return declareSimpleDerivation({
    consume: unaryDerivationConsumer(
      mapper
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
