export const SealEvent = Symbol("SealEvent")
export const EndOfTagEvent = Symbol("EndOfTagEvent")
export type ControlEvent = typeof SealEvent | typeof EndOfTagEvent

/**
 * Types defining an opt-in event protocol for handling complicated cases.
 */
export type CoreEventType = "ADD" | "REMOVE" | "UPDATE"

export type EventScope = "VOID" | "ROOT" | "CHILD" | "DEEP_CHILD"

/**
 * Vocabulary:
 * - UNROLL: a consumer catching up on events prior
 * to its initialization
 */
export type EventSpecies = string

export type SourceTag = string

export type EventTag = Record<string, string> & { id: string }

export type CoreEvent<T> = {
  type: CoreEventType,
  species: EventSpecies,
  eventScope: EventScope,
  payload: T,
  tag?: EventTag
  tagProvenance?: "FIRST" | "LAST"
}

export type Event<T> = Omit<CoreEvent<T>, "tag" | "tagProvenance">

export type MetaEvent = {
  type: "SEAL"
} | {
  type: "VOID",
  tag: EventTag,
  tagProvenance: "LAST"
}

export type BroadEvent<T> = CoreEvent<T> | MetaEvent
