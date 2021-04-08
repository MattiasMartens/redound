import { registerKey } from '@/runtime'
import {
  v4 as uuid
} from 'uuid'

const SEPARATOR = '--'

export function initializeTag(
  prefix?: string,
  id?: string
) {
  const tag = [
    ...(prefix === undefined ? [] : [prefix]),
    id === undefined ? uuid() : id
  ].join(SEPARATOR)

  return registerKey(tag)
}