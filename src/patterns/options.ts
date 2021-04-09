import { getOrElse, Option } from "fp-ts/lib/Option"

export function getSome<T>(option: Option<T>, errorMessage = () => "Expected Option type to be Some but it was None" as string | Error) {
  return getOrElse<T>(
    () => {
      const toThrow = errorMessage()
      throw toThrow instanceof Error ? toThrow : new Error(toThrow)
    }
  )(
    option
  )
}
