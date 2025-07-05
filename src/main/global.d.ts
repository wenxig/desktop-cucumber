declare global {
  interface Error {
    toJSON: () => string
    [x: symbol]: any
  }
}

export { }