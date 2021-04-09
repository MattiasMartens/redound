export async function end(promise: Promise<any>) {
  try {
    await promise
  } catch (e) {
    // no-op  
  }
}

export async function voidPromiseIterable(iterable: Iterable<Promise<void>>) {
  for await (const i of iterable) { i }
}
