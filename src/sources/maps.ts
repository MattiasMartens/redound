import { Possible } from "@/types/patterns";
import { Reconciler } from "big-m";

export const reconcileHashSet = <T>() => (colliding: Possible<Set<T>>, incoming: T) => {
  if (colliding) {
    return colliding.add(incoming)
  } else {
    return new Set([incoming])
  }
}

export const reconcileHashSetDelete = <T>() => (colliding: Possible<Set<T>>, incoming: T) => {
  if (colliding) {
    colliding.delete(incoming)
    if (colliding.size) {
      return colliding
    } else {
      return undefined
    }
  } else {
    return undefined
  }
}
