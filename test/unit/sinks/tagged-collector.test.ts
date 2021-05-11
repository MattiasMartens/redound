import { makeGraph, pullEffect } from "@/core"
import { declareUnaryDerivation } from "@/core/derivation"
import { declareSimpleSource } from "@/core/source"
import { scalarSort } from "@/patterns/arrays"
import { identity } from "@/patterns/functions"
import { course, head } from "@/river"
import { eventCollectorSink } from "@/sinks"
import { taggedCollectorSink } from "@/sinks/tagged-collector"
import { expectationTestAsync } from "@test/helpers"
import { right } from "fp-ts/lib/Either"
import * as expectations from './expectations.meta'

const tags = ['NORTH', 'SOUTH', 'WEST', 'EAST']

describe('taggedCollectorSink', () => {
  it('Collects tagged events', () => expectationTestAsync(
    expectations,
    'taggedCollectorSink',
    async () => {
      const {
        sink1,
        sink2
      } = makeGraph(
        'GENERIC',
        c => {
          const dataFlow = head(
            c,
            {
              wrapped: declareSimpleSource({
                generate: () => ({ output: [1, 2, 4, 8, 16] }),
                pull: (q: number) => right({ output: [q, q * 2, q * 4, q * 8, q * 16] })
              }),
              id: 'MAIN',

            },
            declareUnaryDerivation<number, number, number>(
              {
                open: () => 1,
                consume: ({ event, tag, aggregate }) => {
                  return {
                    output: [event],
                    aggregate: tag === undefined ? aggregate + 1 : aggregate,
                    effects: tag === undefined && aggregate < 4 ? pullEffect({
                      component: 'MAIN', query: aggregate + 1,
                      eventTag: tags[aggregate]
                    }) : []
                  }
                },
                tagSeal({ remainingUnsealedTags }) {
                  return {
                    seal: !remainingUnsealedTags.size
                  }
                }
              }
            )
          )

          const sink1 = course(
            dataFlow,
            taggedCollectorSink()
          )

          const sink2 = course(
            dataFlow,
            eventCollectorSink()
          )

          return {
            sink1,
            sink2
          }
        }
      )

      return {
        sink1: [...await sink1.sinkResult()],
        sink2: [...new Set(await sink2.sinkResult())].sort(scalarSort<number>(identity))
      }
    }))
})