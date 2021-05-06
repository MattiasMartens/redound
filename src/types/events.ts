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

export const NamedEvent = Symbol("NamedEvent")

export const namedEvent = <T>(params: { name: string, payload?: T, end?: boolean }) => {
  const { name } = params
  // @ts-ignore Get out of my business
  delete params.name
  return {
    [NamedEvent]: name,
    ...params
  }
}

// Allows Sources to emit tagged events 'spontaneously', i.e., without a push or pull
// EndOfTagEvents emitted by specifying `end`
// If there is no payload and no `end`, it will be ignored
// TODO it could emit a type of Event `NominalEvent` whose only purpose would be for Sinks to notify Controller of receipt
export type SourceNamedEvent<T> = {
  [NamedEvent]: string,
  payload?: T,
  end?: boolean
}
