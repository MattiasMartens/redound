import { iterateOverAsyncResult } from "../../src/patterns/async"

async function* asyncIterator() {
  yield 1
  yield 2
  yield 3
}

async function main() {
  await (async function () {
    await iterateOverAsyncResult(
      [1, 2, 3],
      a => console.log(a),
      () => false
    )
  })()
}

main()