import { registerKey } from '@/runtime'
import {
  v4 as uuid
} from 'uuid'

export function tag(
  prefix?: string,
  id?: string
) {
  const tag = [
    ...(prefix === undefined ? [] : [prefix]),
    id === undefined ? uuid() : id
  ].join("-")

  return registerKey(tag)
}