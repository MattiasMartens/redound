import { statefulDerivationPrototype } from './stateful'
import { first, last } from '@/patterns/iterables'

function* yieldItemThenAllButFirstAndLastOfArray<T>(item: T, arr: T[]) {
  yield item

  for (let i = 1; i < arr.length - 1; i++) {
    yield arr[i]
  }
}

const newlineRegex = /\r?\n/g
export const stringLinesDerivationPrototype = statefulDerivationPrototype<string, string, string[]>(
  (i, buffer) => {
    const incomingSplitIntoLines = i.split(newlineRegex)

    if (!incomingSplitIntoLines.length) {
      return {
        output: undefined,
        state: buffer
      }
    } else {
      const firstIncomingLine = first(incomingSplitIntoLines)!
      const firstLine = incomingSplitIntoLines.length > 1 ? (buffer.splice(0).join("") + firstIncomingLine) : firstIncomingLine

      const lastLine = last(incomingSplitIntoLines)
      if (lastLine !== "") {
        buffer.push(lastLine)
      }

      return {
        output: yieldItemThenAllButFirstAndLastOfArray(firstLine, incomingSplitIntoLines),
        state: buffer
      }
    }
  },
  () => {
    return []
  },
  {
    name: "StringLines",
    seal(buffer) {
      if (buffer.length) {
        return buffer.join("")
      }
    }
  }
)