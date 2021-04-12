export type Possible<T> = T | undefined

export type Awaited<T> = T extends Promise<infer X> ? X : T