import {
  Source
} from '@/types/abstract'
import { SourceInstance, GenericConsumerInstance } from '@/types/instances'
import { none } from 'fp-ts/lib/Option'
import { clock } from './clock'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Source<T, References, never, never>) {
  return source
}

export function initializeSource<T, References, Finalization, Query>(source: Source<T, References, Finalization, Query>, { id, tick }: { id?: string, tick?: number }): SourceInstance<T, References, Finalization, Query> {
  const tag = initializeTag(
    source.name,
    id
  )

  return {
    clock: clock(tick),
    prototype: source,
    outcome: none,
    subscribers: new Set(),
    references: none,
    tag
  }
}

export function subscribe<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  consumer: GenericConsumerInstance<T, Finalization, Query>
) {
  source.subscribers.add(consumer)
}

export function unsubscribe<T, References, Finalization, Query>(
  source: SourceInstance<T, References, Finalization, Query>,
  consumer: GenericConsumerInstance<T, Finalization, Query>
) {
  source.subscribers.delete(consumer)
}
