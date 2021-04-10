import { declareSimpleSink } from "@/core/sink"
import { noop } from "@/patterns/functions"
import { Sink, Source } from "@/types/abstract"
import { pipe } from "fp-ts/lib/function"
import { map, none, some, Option } from "fp-ts/lib/Option"
import {
  declareSimpleSource
} from "../core/source"

export function consoleLogSinkPrototype<T>(
  name?: string
): Sink<T, void, any, void> {
  return declareSimpleSink({
    open: noop,
    close: noop,
    consumes: new Set(/** TODO */),
    name: name ?? "LogToConsole",
    consume: (e) => console.log(e)
  })
}
