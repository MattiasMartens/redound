import { statefulDerivation } from './stateful'
import { first, last } from '@/patterns/iterables'

function* yieldItemThenAllButFirstAndLastOfArray<T>(item: T, arr: T[]) {
  yield item

  for (let i = 1; i < arr.length - 1; i++) {
    yield arr[i]
  }
}

function* justYield<T>(arr: T[]) {
  for (const item of arr) {
    yield item
  }
}

const newlineRegex = /\r?\n/g
const stringLinesDerivationConstant = statefulDerivation<string, string, string[]>(
  (i, buffer) => {
    const incomingSplitIntoLines = i.split(newlineRegex)

    if (incomingSplitIntoLines.length <= 1) {
      if (first(incomingSplitIntoLines) !== "" && first(incomingSplitIntoLines) !== undefined) {
        buffer.push(first(incomingSplitIntoLines)!)
      }

      return {
        output: [],
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
        return justYield([buffer.join("")])
      } else {
        return []
      }
    }
  }
)

export const stringLinesDerivation = () => stringLinesDerivationConstant