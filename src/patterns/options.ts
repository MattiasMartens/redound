import { getOrElse, Option } from "fp-ts/lib/Option"
import { buildError, ErrorBuilder } from "./errors"

export function getSome<T>(option: Option<T>, errorMessage: ErrorBuilder<[]> = () => "Expected Option type to be Some but it was None") {
  return getOrElse<T>(
    () => {
      const toThrow = buildError(errorMessage)
      throw toThrow instanceof Error ? toThrow : new Error(toThrow)
    }
  )(
    option
  )
}
