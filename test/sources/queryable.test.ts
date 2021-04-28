import { makeController, makeDerivation, makeSink, makeSource } from '@/core'
import { declareSimpleDerivation } from '@/core/derivation'
import { eventCollectorSink } from '@/sinks'
import * as expectations from './expectations.meta'
import {
  iterableSource
} from '@/sources/iterable'
import { Emitter } from '@/types/instances'
import { isLeft } from 'fp-ts/lib/Either'
import { queryableSource } from '@/sources/queryable'
import { defined } from '@/patterns/insist'
import { getOrFail } from 'big-m'
import { expectationTestAsync } from '@test/helpers'

const fragments = [
  "list 1:",
  "{{primes}}",
  "list 2:",
  "{{fibonacci}}",
  "list 3:",
  "{{elements}}",
  "I hope you have enjoyed reading these lists."
]

const sequences = {
  fibonacci: ['1', '1', '2', '3', '5', '8'],
  primes: ['2', '3', '5', '7', '11', '13'],
  elements: ['H', 'He', 'Li', 'Be', 'B', 'C']
}

function* flushBufferedContent({
  contentBuffer,
  bufferingQueries
}: {
  contentBuffer: ({
    tag: "content";
    value: string;
  } | {
    tag: "query", name: string, buffer: string[]
  })[];
  bufferingQueries: Map<string, string[]>;
}) {
  while (contentBuffer.length) {
    const x = contentBuffer[0]!

    if (x.tag === "content") {
      contentBuffer.shift()
      yield x.value
    } else {
      const queryName = x.name

      if (bufferingQueries.has(queryName)) {
        return
      } else {
        contentBuffer.shift()
        yield '\n'
        yield* x.buffer
        yield '\n'
      }
    }
  }
}

describe(
  "queryableSource",
  () => {
    it("Triggers the data result of a source returned by the inner function, when pull() is called downstream", () => expectationTestAsync(expectations, "independentLists", async () => {
      const controller = makeController()
      const source = makeSource(
        iterableSource(fragments),
        { controller }
      )

      const sequenceSource = makeSource(
        queryableSource(
          (listType) => iterableSource(new Set(sequences[listType]))
        ),
        { controller, role: "dynamic" }
      )

      const composingDerivation = makeDerivation(
        declareSimpleDerivation<{ main: Emitter<string>, dynamic: Emitter<string> }, string, {
          contentBuffer: ({ tag: "content", value: string } | {
            tag: "query", name: string, buffer: string[]
          })[],
          bufferingQueries: Map<string, string[]>
        }>({
          name: "ComposingDerivation",
          consumes: {
            main: new Set(),
            dynamic: new Set()
          },
          open() {
            return {
              contentBuffer: [],
              bufferingQueries: new Map()
            }
          },
          consume(
            {
              event,
              aggregate,
              capabilities,
              role,
              tag
            }
          ) {
            const output: string[] = []

            if (role === "main") {
              if (event.startsWith("{{") && event.endsWith("}}")) {
                const dynamicContentQuery = event.slice(2, event.length - 2)

                const pullResult = capabilities.pull({
                  query: dynamicContentQuery,
                  tag: dynamicContentQuery,
                  role: 'dynamic'
                })

                if (isLeft(pullResult)) {
                  throw pullResult.left
                };

                const buffer = []

                aggregate.bufferingQueries.set(
                  dynamicContentQuery,
                  buffer
                )

                aggregate.contentBuffer.push({
                  tag: "query",
                  name: dynamicContentQuery,
                  buffer
                })
              } else if (aggregate.bufferingQueries.size) {
                aggregate.contentBuffer.push({
                  tag: "content",
                  value: event
                })
              } else {
                output.push(event)
              }
            } else {
              const queryName = defined(tag)
              const buffer = getOrFail(
                aggregate.bufferingQueries,
                queryName
              )

              buffer.push(event)
            }

            return {
              aggregate,
              output
            }
          },
          seal(
            {
              aggregate
            }
          ) {
            return {
              seal: !aggregate.bufferingQueries.size
            }
          },
          querySeal({ aggregate, tag, remainingUnsealedSources }) {
            aggregate.bufferingQueries.delete(tag)
            return {
              output: flushBufferedContent(aggregate),
              seal: !aggregate.bufferingQueries.size && remainingUnsealedSources.size === 1
            }
          }
        }),
        {
          main: source,
          dynamic: sequenceSource
        }
      )

      const sink = makeSink(
        eventCollectorSink<string>(),
        composingDerivation
      )

      const finalOutput = await sink.sinkResult()
      const compiled = finalOutput.join(" ").replace(/ \n /g, "\n")
      return compiled
    }))
  }
)
