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
    open: (emit: (e: Event<T>) => Promise<void>) => Outcome<T, Finalization>,
    pull: (emit: (e: Event<T>) => Promise<void>, query: Query, r: References) => void,
    close: (r: References, o: Outcome<T, Finalization>) => Promise<void>,
    tag?: string,
    prefix?: string
  }
): Source<T> {
  const processedTag = tag(bareTag, prefix)

  return {
    consumers: [],
    close,
    emits,
    open,
    pull,
    tag: processedTag
  }
}
