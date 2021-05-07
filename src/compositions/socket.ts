import { makeController, makeSink, makeSource } from "@/core";
import { declareSimpleSink } from "@/core/sink";
import { declareSimpleSource } from "@/core/source";
import { PossiblyAsyncResult } from "@/patterns/async";
import { identity } from "@/patterns/functions";
import { manualAsyncGenerator } from "@/patterns/generators";
import { forEachSink } from "@/sinks";
import { Controller, Sink, Source } from "@/types/abstract";
import { ControllerInstance, SinkInstance, SourceInstance } from "@/types/instances";
import { getOrFail } from "big-m";
import { right } from "fp-ts/lib/Either";
import { none, Option } from "fp-ts/lib/Option";

function normalizeControllerArg(
  controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER"
) {
  if (controller === "NO_CONTROLLER") {
    return undefined
  } else if ("prototype" in controller) {
    return controller
  } else {
    return makeController(controller)
  }
}

/**
 * Create a source–sink pair.
 * Notifications to the socket are emitted through the graph, accompanied by an event tag.
 * When/if they arrive at the sink with the same event tag, the sink notifies the socket.
 */
export function socket<In, Out>(
  controllerArg: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
  params: { sourceId?: string, sinkId?: string } = {}
) {
  const controller = normalizeControllerArg(controllerArg)

  const activeQueries = new Map<
    string,
    {
      write: (t: Out) => void,
      end: () => void
    }
  >()

  const sourceInstance = makeSource(
    declareSimpleSource({
      push: right,
    }),
    {
      id: params.sourceId,
      controller
    }
  )

  // TODO It is very desirable for errors encountered in fulfilling a query to abort the processing of query results.
  // This is not possible until we implement a robust semantics of error propagation... Or at least a plugin system for controllers.
  // For now, the controller will have to achieve this.
  const sink = declareSimpleSink<Out, any, any>({
    consume({ event, tag }) {
      const { write } = getOrFail(
        activeQueries,
        tag
      )

      write(event)
    },
    tagSeal(tag) {
      const { end } = getOrFail(
        activeQueries,
        tag
      )

      activeQueries.delete(tag)

      end()
    }
  })

  return {
    sourceInstance,
    sink,
    send: (i: In, tag: string) => {
      const {
        generator,
        setter,
        ender
      } = manualAsyncGenerator<Out>()

      activeQueries.set(tag, {
        end: ender,
        write: setter
      })
      sourceInstance.push!([i], tag)

      return generator
    }
  } as {
    sourceInstance: SourceInstance<In, any>,
    sink: Sink<Out, any, any>,
    send: (i: In, tag: string) => AsyncIterable<Out>
  }
}
