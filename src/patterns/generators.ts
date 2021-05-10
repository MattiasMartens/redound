import { Possible } from "@/types/patterns"
import { defer, Deferred } from "./async"
import {
  PassThrough
} from 'stream'

async function* innerManualGenerator<T>(
  nextPromise: () => Promise<Possible<T>>,
  final: () => void
) {
  while (true) {
    const value = await nextPromise()

    if (value === undefined) {
      return final()
    } else {
      yield value
    }
  }
}

export function manualAsyncGenerator<T>() {
  let currentDeferredPromise = undefined as Possible<Deferred<Possible<T>>>
  const queue: Possible<T>[] = []
  let currentQueueFullyDisposedPromise = undefined as Possible<Deferred<void>>
  const nextPromise = async () => {
    if (queue.length) {
      return queue.shift()
    } else {
      currentDeferredPromise = defer<Possible<T>>()
      if (currentQueueFullyDisposedPromise) {
        currentQueueFullyDisposedPromise.resolve()
        currentQueueFullyDisposedPromise = undefined
      }
      return currentDeferredPromise.promise
    }
  }
  const setter = (t: T) => {
    if (currentDeferredPromise) {
      const toResolve = currentDeferredPromise
      currentDeferredPromise = undefined
      toResolve.resolve(t)
    } else {
      queue.push(t)
    }

    if (!currentQueueFullyDisposedPromise) {
      currentQueueFullyDisposedPromise = defer()
    }

    return currentQueueFullyDisposedPromise?.promise
  }

  const ender = () => {
    if (currentDeferredPromise) {
      const toResolve = currentDeferredPromise
      currentDeferredPromise = undefined as any
      toResolve.resolve(undefined)
    } else {
      queue.push(undefined)
    }

    return currentQueueFullyDisposedPromise?.promise
  }

  return {
    generator: innerManualGenerator(nextPromise, () => currentQueueFullyDisposedPromise && currentQueueFullyDisposedPromise.resolve()),
    setter,
    ender
  }
}

async function writeToStream<T>(ai: AsyncIterable<T>, s: PassThrough) {
  try {
    for await (const i of ai) {
      await new Promise<void>((resolve, reject) => {
        s.write(i, e => e ? reject(e) : resolve())
      })
    }

    await new Promise<void>(resolve => s.end(resolve))
  } catch (e) {
    s.destroy(e)
  }
}

export function readableStreamFromAsyncIterable<T>(ai: AsyncIterable<T>): PassThrough {
  const s = new PassThrough({
    objectMode: true
  })

  writeToStream(ai, s)

  return s
}
