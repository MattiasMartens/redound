import { buildError, ErrorBuilder } from "./errors";

export function defined<T>(variable: T | undefined, error: ErrorBuilder<[]> = "Expected value to be defined but it was undefined") {
  if (variable === undefined) {
    throw buildError(error)
  } else {
    return variable
  }
}