import { forEachIterable, mapIterable } from '@/patterns/iterables'
import {
  Event,
  MetaEvent,
  Outcome,
  Sink
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance, Controller } from '@/types/instances'
import { isSome, some } from 'fp-ts/lib/Option'
import { fromNullable, none } from 'fp-ts/lib/Option'
import { clock } from './clock'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSink<T, References>(sink: Sink<T, References, never, never>) {
  return sink
}
