import { declareSimpleDerivation } from "@/core/derivation";
import { voidPromiseIterable } from "@/patterns/async";
import { forEachIterable, mapIterable } from "@/patterns/iterables";
import { Derivation } from "@/types/abstract";
import { Emitter } from "@/types/instances";
import { Possible } from "@/types/patterns";
import { getOrElse, getOrFill } from "big-m";

export function tagScopedDerivation<DerivationSourceType extends Record<string, Emitter<any>>, T, Aggregate>(
  derivation: Derivation<DerivationSourceType, T, Aggregate>
) {
  return declareSimpleDerivation<DerivationSourceType, T, Map<string | null, Aggregate>>({
    ...derivation,
    close(a, o) {
      return voidPromiseIterable(
        mapIterable(
          a,
          async ([, aggregate]) => derivation.close(aggregate, o)
        )
      )
    },
    consume(params) {
      const {
        aggregate,
        tag = null
      } = params

      const scopedAggregate = getOrFill(
        aggregate,
        tag,
        () => derivation.open()
      )

      const consumptionResult = derivation.consume({
        ...params,
        aggregate: scopedAggregate
      })

      if ('aggregate' in consumptionResult) {
        aggregate.set(tag, consumptionResult.aggregate!)
        delete consumptionResult.aggregate
      }

      return consumptionResult as Omit<typeof consumptionResult, 'aggregate'>
    },
    seal(params) {
      const { aggregate } = params

      const sealResult = derivation.seal({
        ...params,
        aggregate: getOrElse(aggregate, undefined, () => derivation.open())
      })

      if ('aggregate' in sealResult) {
        aggregate.set(null, sealResult.aggregate!)
        delete sealResult.aggregate
      }

      return sealResult as Omit<typeof sealResult, 'aggregate'>
    },
    tagSeal(params) {
      const {
        tag,
        aggregate
      } = params

      const scopedAggregate = getOrElse(
        aggregate,
        tag,
        () => derivation.open()
      )

      aggregate.delete(tag)

      const tagSealResult = derivation.tagSeal({
        ...params,
        aggregate: scopedAggregate
      })

      if ('aggregate' in tagSealResult) {
        aggregate.set(tag, tagSealResult.aggregate!)
        delete tagSealResult.aggregate
      }

      return tagSealResult as Omit<typeof tagSealResult, 'aggregate'>
    }
  })
}