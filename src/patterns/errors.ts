export type ErrorBuilder<T extends any[]> = string | Error | ((...t: T) => string | Error)

export function buildError<T extends any[]>(errorBuilder: ErrorBuilder<T>, ...input: T) {
  if (typeof errorBuilder === 'string') {
    return new Error(errorBuilder)
  } else if (errorBuilder instanceof Error) {
    return errorBuilder
  } else {
    const yielded = errorBuilder(...input)

    if (typeof yielded === 'string') {
      return new Error(yielded)
    } else {
      return yielded
    }
  }
}
