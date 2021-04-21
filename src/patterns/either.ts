import { Either, getOrElse } from "fp-ts/lib/Either"
import { buildError, ErrorBuilder } from "./errors"

export function getRight<T>(option: Either<never, T>, error: ErrorBuilder<[]> = "Expected Option type to be Some but it was None") {
  return getOrElse<never, T>(
    () => {
      throw buildError(error)
    }
  )(
    option
  )
}
