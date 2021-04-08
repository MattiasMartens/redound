const keyRegistry = new Set<string>()

export const registerKey = (id: string) => {
  if (keyRegistry.has(id)) {
    throw new Error(`Tried to register key more than once: ${id}`)
  } else {
    keyRegistry.add(id)
    return id
  }
}

let runtimeClock = 1
let clockWasHydrated = false

export function hydrateClock(tick: number) {
  if (runtimeClock === 1 && !clockWasHydrated) {
    runtimeClock = tick
    clockWasHydrated = true
  } else {
    throw new Error('Clock has already been hydrated, or has already ticked; therefore, cannot guarantee app correctness. Structure your code to call hydrateClock() before it is possible for anything to tick.')
  }
}

const clockAwaiters: Map<number, ((currentTick: number) => void)[]> = new Map()

export const clock = () => runtimeClock

export const tick = () => {
  runtimeClock++
  clockAwaiters.forEach(
    (fns, clockValue) => {
      if (clockValue <= runtimeClock) {
        fns.forEach(f => f(runtimeClock))
      }
    }
  )
  return runtimeClock
}

export function awaitTick(tick: number) {
  return new Promise<number>(resolve => {
    if (tick <= runtimeClock) {
      resolve(runtimeClock)
    } else {
      if (!clockAwaiters.has(tick)) {
        clockAwaiters.set(tick, [])
      }

      const resolveSet = clockAwaiters.get(tick)!
      resolveSet.push(resolve)
    }
  })
}

