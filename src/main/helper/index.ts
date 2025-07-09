import type { AnyFn } from "@vueuse/core"

const unprocessedErrorSymbol = Symbol('unprocessedError')
export const tryRun = <T extends AnyFn | ((...args: any[]) => Promise<any>)>(fn: T, handleError: (err: Error) => ReturnType<T>): ReturnType<T> => {
  try {
    return fn()
  } catch (error) {
    if (!(error instanceof Error)) throw error
    if (error[unprocessedErrorSymbol]) throw error
    try {
      return handleError(error)
    } catch (error) {
      if (!(error instanceof Error)) throw error
      throw error[unprocessedErrorSymbol] = true && error
    }
  }
}