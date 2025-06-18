import type { Rectangle } from "electron"
export type Inject = {
  api: {
    changeEditMode(to: boolean): void
    tiggerTaskBarHideStatue(): void
  }
  event<T extends keyof On['event']>(event: T, callback: (...p: On['event'][T]) => void): () => void
}

export type On = {
  event: {
    'workspace-changed': [is: 'show' | 'hide']
    'edit-mode-changed': [to: boolean]
    'full-screen-changed': [to: boolean]
  }
}
