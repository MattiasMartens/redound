import { makeController, makeDerivation, makeSink, makeSource } from '@/core'
import { declareSimpleDerivation } from '@/core/derivation'
import { eventCollectorSink } from '@/sinks'
import {
  deferredSource
} from '@/sources/deferred'
import {
  iterableSource
} from '@/sources/iterable'
import { Emitter } from '@/types/instances'
import { isLeft } from 'fp-ts/lib/Either'
import {
  strictEqual
} from 'assert'

const fragments = [
  "What follows",
  "is a list of",
  "animals of a particular kind:",
  "{{marsupials}}",
  "I hope you enjoyed reading this list."
]

const sequences = {
  marsupials: ["platypus", "kangaroo", "koala"],
  mammals: ["human", "raccoon", "weasel", "bear"]
}

describe(
  "deferredSource",
  () => {
    it("Triggers the data result of a source returned by the inner function, when pull() is called downstream", async () => {
      const controller = makeController()
      const source = makeSource(
        iterableSource(fragments),
        { controller }
      )

      const sequenceSource = makeSource(
        deferredSource(
          (animalType) => iterableSource(sequences[animalType])
        ),
        { controller, role: "dynamic" }
      )

      const composingDerivation = makeDerivation(
        declareSimpleDerivation<{ main: Emitter<string>, dynamic: Emitter<string> }, string, {
          postDynamicContentBuffer: string[],
          emittingDynamicContent: boolean
        }>({
          name: "ComposingDerivation",
          consumes: {
            main: new Set(),
            dynamic: new Set()
          },
          open() {
            return {
              emittingDynamicContent: false,
              postDynamicContentBuffer: []
            }
          },
          consume(
            {
              event,
              aggregate,
              capabilities,
              role
            }
          ) {
            const output: string[] = []

            if (role === "main") {
              if (event.startsWith("{{") && event.endsWith("}}")) {
                const dynamicContentQuery = event.slice(2, event.length - 2)

                const pullResult = capabilities.pull({
                  query: dynamicContentQuery,
                  role: 'dynamic'
                })

                if (isLeft(pullResult)) {
                  throw pullResult.left
                }

                aggregate.emittingDynamicContent = true
              } else if (aggregate.emittingDynamicContent) {
                aggregate.postDynamicContentBuffer.push(event)
              } else {
                output.push(event)
              }
            } else {
              output.push(event)
            }

            return {
              aggregate,
              output
            }
          },
          seal(
            {
              aggregate,
              role,
              remainingUnsealedSources
            }
          ) {
            const output: string[] = []

            if (role === "dynamic") {
              output.push(...aggregate.postDynamicContentBuffer.splice(0))
            }

            return {
              aggregate,
              output,
              seal: !remainingUnsealedSources.size
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
      const compiled = finalOutput.join(" ")
      strictEqual(
        compiled,
        "What follows is a list of animals of a particular kind: platypus kangaroo koala I hope you enjoyed reading this list."
      )
    })

    it("Triggers the data result of any Iterable returned by the inner function, when pull() is called downstream", async () => {
      const controller = makeController()
      const source = makeSource(
        iterableSource(fragments),
        { controller }
      )

      const sequenceSource = makeSource(
        deferredSource(
          (animalType) => sequences[animalType]
        ),
        { controller, role: "dynamic" }
      )

      const composingDerivation = makeDerivation(
        declareSimpleDerivation<{ main: Emitter<string>, dynamic: Emitter<string> }, string, {
          postDynamicContentBuffer: string[],
          emittingDynamicContent: boolean
        }>({
          name: "ComposingDerivation",
          consumes: {
            main: new Set(),
            dynamic: new Set()
          },
          open() {
            return {
              emittingDynamicContent: false,
              postDynamicContentBuffer: []
            }
          },
          consume(
            {
              event,
              aggregate,
              capabilities,
              role
            }
          ) {
            const output: string[] = []
            if (role === "main") {
              if (event.startsWith("{{") && event.endsWith("}}")) {
                const dynamicContentQuery = event.slice(2, event.length - 2)

                const pullResult = capabilities.pull({
                  query: dynamicContentQuery,
                  role: 'dynamic'
                })

                if (isLeft(pullResult)) {
                  throw pullResult.left
                }

                aggregate.emittingDynamicContent = true
              } else if (aggregate.emittingDynamicContent) {
                aggregate.postDynamicContentBuffer.push(event)
              } else {
                output.push(event)
              }
            } else {
              output.push(event)
            }

            return {
              aggregate,
              output
            }
          },
          seal(
            {
              aggregate,
              role,
              remainingUnsealedSources
            }
          ) {
            const output: string[] = []

            if (role === "dynamic") {
              output.push(...aggregate.postDynamicContentBuffer.splice(0))
            }

            return {
              aggregate,
              output,
              seal: !remainingUnsealedSources.size
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
      const compiled = finalOutput.join(" ")
      strictEqual(
        compiled,
        "What follows is a list of animals of a particular kind: platypus kangaroo koala I hope you enjoyed reading this list."
      )
    })
  }
)
