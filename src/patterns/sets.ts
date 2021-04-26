import { Possible } from "@/types/patterns"

export const createSetFromNullable = <T>(t: Possible<T>) => t === undefined ? new Set<T>() : new Set([t])