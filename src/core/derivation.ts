import { voidPromiseIterable } from '@/patterns/async'
import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  BareSourceEmitted,
  Derivation,
  Event,
  MetaEvent,
  Outcome,
  QueryState,
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller } from '@/types/instances'
import {
  noop
} from '@/patterns/functions'
import { isNone, isSome, Option, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock, tick } from './clock'
import { consume, close as consumerClose } from './consumer'
import { bareSourceEmittedToEvent } from './events'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleDerivation<T, References>(derivation: Omit<Derivation<T, References, never, never>, "graphComponentType" | "sourceCapability">) {
  return Object.assign(
    derivation,
    {
      sourceCapability: none,
      graphComponentType: "Derivation"
    }
  ) as Derivation<T, References, never, never>
}
