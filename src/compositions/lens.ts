import { declareUnaryDerivation } from "@/core/derivation";
import { UnaryDerivation } from "@/derivations";
import { transformAsyncResult } from "@/patterns/async";

/**
 * Pass data through a derivation, supplying only a subset of data to it and composing its output with the original event to produce the final output.
 */
export function unaryLensDerivation<In, LensedIn, LensedOut, Out, Aggregate>(
  lens: {
    refract: (incoming: In) => LensedIn,
    focus: (toSet: In, emitted: LensedOut) => Out,
    lift: (emitted: LensedOut) => Out
  },
  derivation: UnaryDerivation<LensedIn, LensedOut, Aggregate>
): UnaryDerivation<In, Out, Aggregate> {
  return declareUnaryDerivation<In, Out, Aggregate>({
    ...derivation,
    consume(params) {
      const transformedEvent = lens.refract(params.event)

      const consumeResult = derivation.consume<'main'>({
        ...params,
        event: transformedEvent
      })

      return {
        ...consumeResult,
        output: transformAsyncResult(consumeResult.output, (o: LensedOut) => lens.focus(params.event, o))
      }
    },
    tagSeal(params) {
      const tagSealResult = derivation.tagSeal(params)

      return {
        ...tagSealResult,
        output: transformAsyncResult(tagSealResult.output, (o: LensedOut) => lens.lift(o))
      }
    },
    seal(params) {
      const tagSealResult = derivation.seal(params)

      return {
        ...tagSealResult,
        output: transformAsyncResult(tagSealResult.output, (o: LensedOut) => lens.lift(o))
      }
    }
  })
}
