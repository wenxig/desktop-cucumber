declare global {
  interface Error {
    toJSON: () => this
  }
}

export { }