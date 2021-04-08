import {
  Event,
  EventSpec,
  Outcome,
  Source
} from '@/types'
import { tag } from './tags'

export function declareSource<T, References, Finalization, Query>(
  {
    tag: bareTag,
    prefix,
    close,
    emits,
    open,
    pull
  }: {
    emits: Set<EventSpec<T>>,
      open: (emit: (e: Event<T, never>) => Promise<void>) => Outcome<T, Finalization, Query>,
      pull: (emit: (e: Event<T, Query>) => Promise<void>, query: Query, r: References) => void,
      close: (r: References, o: Outcome<T, Finalization, Query>) => Promise<void>,
    tag?: string,
    prefix?: string
  }
): Source<T, Query> {
  const processedTag = tag(bareTag, prefix)

  return {
    consumers: new Set(),
    close,
    emits,
    open,
    pull,
    tag: processedTag
  }
}
