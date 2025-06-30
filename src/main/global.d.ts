declare global {
  interface Error {
    toJSON: () => string
  }
}

export { }