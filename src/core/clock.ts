type Clock = {
  tick: number,
  awaiters: Map<number, ((currentTick: number) => void)[]>
}

export function clock(tick = 1): Clock {
  return {
    tick,
    awaiters: new Map()
  }
}

export const tick = (clock: Clock) => {
  clock.tick++
  clock.awaiters.forEach(
    (fns, clockValue) => {
      if (clockValue <= clock.tick) {
        fns.forEach(f => f(clock.tick))
      }
    }
  )
  return clock
}

export function awaitTick(clock: Clock, tick: number) {
  return new Promise<number>(resolve => {
    if (tick <= clock.tick) {
      resolve(tick)
    } else {
      if (!clock.awaiters.has(tick)) {
        clock.awaiters.set(tick, [])
      }

      const resolveSet = clock.awaiters.get(tick)!
      resolveSet.push(resolve)
    }
  })
}
