import {
  Event,
  EventSpec,
  Outcome,
  Source
} from '@/types/abstract'
import { SourceInstance } from '@/types/instances'
import { none } from 'fp-ts/lib/Option'
import { initializeTag } from './tags'

/**
 * TypeScript doesn't allow mixing inferred with optional
 * types, so this allows a simpler type declaration for a
 * Source.
 */
export function declareSimpleSource<T, References>(source: Source<T, References, never, never>) {
  return source
}

export function initializeSource<T, References, Finalization, Query>(source: Source<T, References, Finalization, Query>, id?: string): SourceInstance<T, References, Finalization, Query> {
  const tag = initializeTag(
    source.name,
    id
  )

  return {
    source,
    outcome: none,
    subscribers: new Set(),
    references: none,
    tag
  }
}
