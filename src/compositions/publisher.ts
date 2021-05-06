import { makeController, makeSource } from "@/core"
import { forEachIterable } from "@/patterns/iterables"
import { getSome } from "@/patterns/options"
import { manualSource } from "@/sources"
import { Controller } from "@/types/abstract"
import { ControllerInstance, SourceInstance } from "@/types/instances"
import { foldingGet } from "big-m"
import { makeManual } from "./manual"

// TODO Test this.
// Create methods describing a pub/sub pattern.
// Each subscriber is a Source.
// Sources may belong to different component graphs.
// When something calls publish(), all active Sources emit that argument.
export function publisher<T>(): {
  publish: (t: T) => void,
  shutdown: () => void,
  makeSubscriber: (
    controller: ControllerInstance<any> | Controller<any> | "NO_CONTROLLER",
    params?: { id?: string }
  ) => SourceInstance<T, any>,
  unsubscribe: (s: SourceInstance<T, any>) => void
} {
  const subscribed: Map<SourceInstance<T, any>, { set: (t: T) => void, end: () => void }> = new Map()

  return {
    publish: (t: T) => forEachIterable(
      subscribed,
      ([, methods]) => methods.set(t)
    ),
    shutdown: () => forEachIterable(
      subscribed,
      ([, methods]) => methods.end()
    ),
    unsubscribe: (s) => {
      foldingGet(
        subscribed,
        s,
        ({ end }) => end()
      )

      subscribed.delete(s)
    },
    makeSubscriber: (
      controllerArg,
      params = {}
    ) => {

      const {
        source,
        ...methods
      } = makeManual<T>(
        controllerArg,
        params
      )

      subscribed.set(source, methods)

      return source
    }
  }
}
