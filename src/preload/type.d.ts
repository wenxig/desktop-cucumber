export type Inject = {
  api: {
    changeEditMode(to: boolean): void
  }
  event<T extends keyof On['event']>(event: T, callback: (...p: On['event'][T]) => void): () => void
}

export type On = {
  event: {
    'workspace-changed': ['show' | 'hide']
    'edit-mode-changed': [boolean]
  }
}
