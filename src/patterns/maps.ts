import { reconcileHashSet, reconcileHashSetDelete } from "@/sources/maps"
import { Possible } from "@/types/patterns"
import { reconcileEntryInto, getOrElse } from "big-m"

export function OneToManyBinMap<A1, A2>() {
  const binMap = new Map<A1, Set<A2>>()
  const lookupMap = new Map<A2, A1>()

  const addPair = (a1: A1, a2: A2) => {
    const updatedSet = reconcileEntryInto(
      binMap,
      a1,
      a2,
      reconcileHashSet()
    )!

    if (lookupMap.has(a2)) {
      const valAt = lookupMap.get(a2)
      if (valAt !== a1) {
        debugger;;;
        throw new Error("Value cannot occupy more than one bin")
      }
    } else {
      lookupMap.set(a2, a1)
    }

    return updatedSet
  }

  const deletePair = (a1: A1, a2: A2) => {
    const updatedSet = reconcileEntryInto(
      binMap,
      a1,
      a2,
      reconcileHashSetDelete()
    )

    lookupMap.delete(a2)

    return updatedSet
  }

  const getBin = (a1: A1) => binMap.get(a1)

  const findBinOwner = (a2: A2) => lookupMap.get(a2)

  const binOwners = () => new Set(binMap.keys())
  const binOccupants = () => new Set(lookupMap.keys())

  return {
    addPair,
    deletePair,
    getBin,
    findBinOwner,
    binOccupants,
    binOwners
  }
}

export type OneToManyBinMap<A1, A2> = {
  addPair: (a1: A1, a2: A2) => Set<A2>,
  deletePair: (a1: A1, a2: A2) => Possible<Set<A2>>,
  getBin: (a1: A1) => Possible<Set<A2>>,
  findBinOwner: (a2: A2) => A1,
  binOwners: () => Set<A1>,
  binOccupants: () => Set<A2>
}
